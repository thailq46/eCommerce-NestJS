import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {RedisService} from 'src/base/db/redis/redis.service';
import {LoggingService} from 'src/base/logging';
import {Sku} from 'src/modules/sku/entities/sku.entity';
import {Spu} from 'src/modules/spu/entities/spu.entity';
import {Repository} from 'typeorm';

/** CLASS DÙNG ĐỂ TEST */
@Injectable()
export class SpuCacheService {
   private count = 0;

   constructor(
      @InjectRepository(Spu)
      private readonly spuRepo: Repository<Spu>,
      @InjectRepository(Sku)
      private readonly loggingService: LoggingService,
      private readonly redisService: RedisService,
   ) {}

   private genEventItemKey(itemId: string) {
      return 'PRO_SPU:ITEM:' + itemId;
   }

   /** (Câu lệnh để test)
    * echo GET http://localhost:3005/api/v1/spu/info/2/normal | vegeta attack -name=2000qps -duration=10s -rate=100 | vegeta report
    * [?] Vấn đề của hàm getSpuDetailByIdCacheNormal dù đã check cache nhưng vẫn query DB
    * Vì Khi nhiều reqs đi vào Redis thì nó xử lý không kịp VD: 1000reqs đi vào kiểm tra cache trong vòng 100ms -> chắc chắn sẽ có rất nhiều reqs lọt vô đc MySQL -> Lúc này cache bị gãy ngay tức thì
    */
   async getSpuDetailByIdCacheNormal(id: number) {
      // 1. Check cache first by Redis
      const spuDetail = await this.redisService.get(this.genEventItemKey(id.toString()));
      // Biến này và biến count dùng để test số lần bị lọt qua cache và truy vấn DB
      const testCountKey = `test:db-queries:${id}`;
      // 2. Yes -> Hit cache
      if (spuDetail !== null) {
         this.loggingService.logger.default.log(
            `FROM CACHE: ${id} ----- ${Date.now()} ----- ${spuDetail} --- COUNT: ${this.count}`,
            'getSpuDetailByIdCache',
         );
         return {
            message: `Lấy thông tin sản phẩm thành công từ cache`,
            data: JSON.parse(spuDetail),
         };
      }
      // 3. No -> Miss cache, fetch from DB
      const spuInfo = await this.spuRepo.findOne({
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
      if (!spuInfo) {
         throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
      }
      await this.redisService.getClient().incr(testCountKey);
      // 4. Set cache
      await this.redisService.set({
         key: this.genEventItemKey(id.toString()),
         value: JSON.stringify({...spuInfo, COUNT: this.count}),
      });
      this.count++;
      this.loggingService.logger.default.log(
         `FROM DBS: ${id} ----- ${Date.now()} ----- ${spuDetail} --- COUNT: ${this.count}`,
         'getSpuDetailByIdCache',
      );
      return {
         message: `Lấy thông tin sản phẩm thành công`,
         data: spuInfo,
      };
   }

   /**
    * echo GET http://localhost:3005/api/v1/spu/info/2/advanced | vegeta attack -name=1000qps -duration=10s -rate=100 | vegeta report
    * [?] Trong hệ thống Monolith thì sử dụng LUA Redis thì khá là ngon, còn nếu chuyển sang Microservices thì không ổn thì tại sao ko sử dụng LUA Redis trong trường hợp này(Microservices)?
    * Vì LUA nó rất khó để control việc unLock khóa vì sử dụng nhiều Service mà 1 service bị disconnect,mà trong TH này Service nó vẫn chạy đc vì có Cluster (1 thằng chết thì thằng khác vẫn chạy) -> Nếu mà sử dụng LUA thì sẽ ko bao h unLock hoặc khó có thể triển khai thao tác lock và unLock trong Redis
    */
   async getSpuDetailByIdCacheAdvanced(id: number) {
      const resourceId = Date.now().toString();
      const testCountKey = `test:db-queries:${id}`;
      // 1. Check cache
      const cachedData = await this.redisService.get(this.genEventItemKey(id.toString()));
      if (cachedData !== null) {
         this.loggingService.logger.default.log(
            `FROM CACHE: ${id} ----- ${Date.now()} ----- ${cachedData}`,
            'getSpuDetailByIdCacheAdvanced',
         );
         return {
            message: `Lấy thông tin sản phẩm thành công từ cache`,
            data: JSON.parse(cachedData),
         };
      }
      // 2. Tạo distributed lock
      const keyLock = `PRO_LOCK_KEY_ITEM:${id}`;
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
         const cachedDataAfterLock = await this.redisService.get(this.genEventItemKey(id.toString()));
         if (cachedDataAfterLock !== null) {
            this.loggingService.logger.default.log(
               `FROM CACHE AFTER LOCK: ${id} ----- ${Date.now()} ----- ${cachedDataAfterLock}`,
               'getSpuDetailByIdCacheAdvanced',
            );
            return {
               message: `Lấy thông tin sản phẩm thành công từ cache sau khi có khóa`,
               data: JSON.parse(cachedDataAfterLock),
            };
         }
         // 5. Fetch from DB
         const spuInfo = await this.spuRepo.findOne({
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
         if (!spuInfo) {
            throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
         }
         await this.redisService.getClient().incr(testCountKey);
         // 6. Set cache
         await this.redisService.set({
            key: this.genEventItemKey(id.toString()),
            value: JSON.stringify(spuInfo),
         });
         this.loggingService.logger.default.log(
            `FROM DBS: ${id} ----- ${Date.now()} ----- ${JSON.stringify(spuInfo)}`,
            'getSpuDetailByIdCacheAdvanced',
         );
         return {
            message: `Lấy thông tin sản phẩm thành công`,
            data: spuInfo,
         };
      } catch (error) {
         this.loggingService.logger.default.error(
            `[${resourceId}] Error acquiring lock for SPU ID ${id}: ${error}`,
            'SpuService',
         );
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException(`Lỗi khi lấy thông tin sản phẩm`);
      } finally {
         // 4. Release lock
         // Lưu ý: Cho dù thành công hay không cũng phải unLock, bằng mọi giá.
         await this.redisService.unlock(keyLock);
      }
   }
}
