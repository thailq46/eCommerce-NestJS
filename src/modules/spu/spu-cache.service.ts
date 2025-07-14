import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {RedisService} from 'src/base/db/redis/redis.service';
import {LoggingService} from 'src/base/logging';
import {Spu} from 'src/modules/spu/entities/spu.entity';
import {SpuCacheData, SpuCacheResponse} from 'src/modules/spu/types';
import {Repository} from 'typeorm';

@Injectable()
export class SpuCacheService {
   private count = 0;

   constructor(
      @InjectRepository(Spu)
      private readonly spuRepo: Repository<Spu>,
      private readonly loggingService: LoggingService,
      private readonly redisService: RedisService,
   ) {}

   private findSpuById(id: number): Promise<SpuCacheData | null> {
      return this.spuRepo.findOne({
         where: {spu_id: id, is_deleted: false},
         select: [
            'spu_id',
            'product_name',
            'product_desc',
            'product_slug',
            'product_thumb',
            'product_category',
            'product_shop',
            'product_price',
            'product_quantity',
            'product_rating_avg',
            'product_variations',
         ],
      });
   }

   private testCountKey(id: number): string {
      return `count:db-query:${id}`;
   }

   private generateCacheKey(itemId: string): string {
      return 'PRO_SPU:ITEM:' + itemId;
   }

   private generateLockKey(itemId: string): string {
      return 'PRO_LOCK_KEY_ITEM:' + itemId;
   }

   private async getCache(key: string): Promise<string | null> {
      return await this.redisService.get(this.generateCacheKey(key));
   }

   private async setCache(key: string, value: string): Promise<void> {
      await this.redisService.set({
         key: this.generateCacheKey(key),
         value,
      });
   }

   private createSuccessResponse(data: SpuCacheData, fromCache: boolean = false): SpuCacheResponse {
      return {
         message: fromCache ? 'Lấy thông tin sản phẩm thành công từ cache' : 'Lấy thông tin sản phẩm thành công',
         data,
      };
   }

   private async getCachedData(id: number): Promise<SpuCacheData | null> {
      const cachedData = await this.getCache(id.toString());
      if (cachedData !== null) {
         this.loggingService.logger.default.log(`FROM CACHE: ${id} ----- ${Date.now()} ----- ${cachedData}`);
         return JSON.parse(cachedData);
      }
      return null;
   }

   private async fetchFromDatabase(id: number): Promise<SpuCacheData> {
      const spuInfo = await this.findSpuById(id);
      if (!spuInfo) {
         throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
      }
      return spuInfo;
   }

   /**
    * echo GET http://localhost:3005/api/v1/spu/info/2/normal | vegeta attack -name=2000qps -duration=10s -rate=100 | vegeta report
    * [?] Vấn đề của hàm getSpuDetailByIdCacheNormal dù đã check cache nhưng vẫn query DB
    * Vì Khi nhiều reqs đi vào Redis thì nó xử lý không kịp VD: 1000reqs đi vào kiểm tra cache trong vòng 100ms -> chắc chắn sẽ có rất nhiều reqs lọt vô đc MySQL -> Lúc này cache bị gãy ngay tức thì
    */
   async getSpuDetailByIdCacheNormal(id: number) {
      // 1. Check cache first
      const cachedData = await this.getCachedData(id);
      // Biến này và biến count dùng để test số lần bị lọt qua cache và truy vấn DB
      const testCountKey = this.testCountKey(id);
      // 2. Yes -> Hit cache
      if (cachedData) {
         return this.createSuccessResponse(cachedData, true);
      }
      // 3. No -> Miss cache, fetch from DB
      const spuInfo = await this.fetchFromDatabase(id);
      await this.redisService.getClient().incr(testCountKey);
      // 4. Set cache
      await this.setCache(id.toString(), JSON.stringify({...spuInfo, COUNT: this.count}));
      this.count++;
      this.loggingService.logger.default.log(
         `FROM DBS: ${id} ----- ${Date.now()} ----- ${JSON.stringify(spuInfo)} --- COUNT: ${this.count}`,
         'getSpuDetailByIdCacheNormal',
      );
      // 5. Return response
      return this.createSuccessResponse(spuInfo);
   }

   /**
    * echo GET http://localhost:3005/api/v1/spu/info/2/advanced | vegeta attack -name=1000qps -duration=10s -rate=100 | vegeta report
    * [?] Trong hệ thống Monolith thì sử dụng LUA Redis thì khá là ngon, còn nếu chuyển sang Microservices thì không ổn thì tại sao ko sử dụng LUA Redis trong trường hợp này(Microservices)?
    * Vì LUA nó rất khó để control việc unLock khóa vì sử dụng nhiều Service mà 1 service bị disconnect,mà trong TH này Service nó vẫn chạy đc vì có Cluster (1 thằng chết thì thằng khác vẫn chạy) -> Nếu mà sử dụng LUA thì sẽ ko bao h unLock hoặc khó có thể triển khai thao tác lock và unLock trong Redis
    */
   async getSpuDetailByIdCacheAdvanced(id: number) {
      const resourceId = Date.now().toString();
      const testCountKey = this.testCountKey(id);
      // 1. Check cache first
      const cachedData = await this.getCachedData(id);
      if (cachedData) {
         return this.createSuccessResponse(cachedData, true);
      }
      // 2. Tạo distributed lock
      const keyLock = this.generateLockKey(id.toString());
      try {
         // 3. Tạo khóa
         const isLocked = await this.redisService.tryLock({
            waitTime: 1,
            leaseTime: 5,
            unit: 'seconds',
            keyLock,
            value: resourceId,
         });
         if (!isLocked) {
            this.loggingService.logger.default.debug(
               `[${resourceId}] Could not acquire lock for SPU ID ${id}, waiting before retry...`,
               'SpuService',
            );
            return {
               message: `Đang chờ lấy khóa cho sản phẩm với ID ${id}, vui lòng thử lại sau`,
            };
         }
         // 4. Double-check cache sau khi có lock (ngăn race condition)
         const cachedDataAfterLock = await this.getCachedData(id);
         if (cachedDataAfterLock !== null) {
            this.loggingService.logger.default.log(
               `FROM CACHE AFTER LOCK: ${id} ----- ${Date.now()} ----- ${JSON.stringify(cachedDataAfterLock)}`,
               'getSpuDetailByIdCacheAdvanced',
            );
            return this.createSuccessResponse(cachedDataAfterLock, true);
         }
         // 5. Fetch from DB
         const spuInfo = await this.fetchFromDatabase(id);
         await this.redisService.getClient().incr(testCountKey);
         // 6. Set cache
         await this.setCache(id.toString(), JSON.stringify(spuInfo));
         this.loggingService.logger.default.log(
            `FROM DBS: ${id} ----- ${Date.now()} ----- ${JSON.stringify(spuInfo)}`,
            'getSpuDetailByIdCacheAdvanced',
         );
         // 7. Return response
         return this.createSuccessResponse(spuInfo);
      } catch (error) {
         this.loggingService.logger.default.error(
            `[${resourceId}] Error acquiring lock for SPU ID ${id}: ${error}`,
            'SpuService',
         );
         throw new BadRequestException(`Lỗi khi lấy thông tin sản phẩm`);
      } finally {
         // 8. Release lock
         // (*) Lưu ý: Cho dù thành công hay không cũng phải unLock, bằng mọi giá.
         await this.redisService.unlock(keyLock);
      }
   }
}
