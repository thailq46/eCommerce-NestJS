import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {RedisService} from 'src/base/db/redis/redis.service';
import {LoggingService} from 'src/base/logging';
import {generateSlugify} from 'src/base/utils/functions';
import {ShopService} from 'src/modules/shop/shop.service';
import {Sku} from 'src/modules/sku/entities/sku.entity';
import {Spu} from 'src/modules/spu/entities/spu.entity';
import {ProductVariationsType, SkuItemType} from 'src/modules/spu/types';
import {IUser} from 'src/modules/user/types';
import {DataSource, Repository} from 'typeorm';
import {CreateSpuDto} from './dto/create-spu.dto';
import {UpdateSpuDto} from './dto/update-spu.dto';

@Injectable()
export class SpuService {
   private count = 0;

   constructor(
      @InjectRepository(Spu)
      private readonly spuRepo: Repository<Spu>,
      @InjectRepository(Sku)
      private readonly skuRepo: Repository<Sku>,
      private readonly loggingService: LoggingService,
      private readonly shopService: ShopService,
      private readonly dataSource: DataSource,
      private readonly redisService: RedisService,
   ) {}

   async create(payload: CreateSpuDto, user: IUser) {
      const {
         product_name,
         product_category,
         product_desc,
         product_variations,
         product_rating_avg,
         product_thumb,
         sku_list,
      } = payload;
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
         const shop = await this.shopService.findShopByOwnerId(user.usr_id);
         if (!shop) {
            throw new NotFoundException('Không tìm thấy shop');
         }
         const hasDefaultSku = sku_list.some((sku) => sku.sku_default);
         if (!hasDefaultSku) {
            throw new BadRequestException('Phải có ít nhất 1 SKU mặc định');
         }

         const hasValidData = this.validateSkuListCompleteness(product_variations ?? [], sku_list ?? []);
         if (!hasValidData.valid) {
            const {missing, extra} = hasValidData;
            const missingStr = missing.map((m) => m.join(',')).join(' | ');
            const extraStr = extra.map((e) => e.join(',')).join(' | ');
            throw new BadRequestException(
               `Danh sách SKU không hợp lệ: Thiếu các SKU: [${missingStr}] | Thừa các SKU: [${extraStr}]`,
            );
         }

         const product_slug = this.generateProductSlug(product_name, shop.shop_id);
         const defaultSku = sku_list.find((sku) => sku.sku_default);

         const spu = this.spuRepo.create({
            product_name,
            product_desc,
            product_slug,
            product_thumb,
            product_category,
            product_shop: shop.shop_id,
            product_price: defaultSku?.sku_price || 0,
            product_quantity: defaultSku?.sku_stock || 0,
            product_rating_avg,
            product_variations: JSON.stringify(product_variations),
         });

         const savedSpu = await queryRunner.manager.save(spu);

         const skus = sku_list.map((sku) => {
            return this.skuRepo.create({
               sku_price: sku.sku_price,
               sku_stock: sku.sku_stock,
               sku_default: sku.sku_default ? 1 : 0,
               product_id: savedSpu.spu_id,
               sku_tier_idx: JSON.stringify(sku.sku_tier_idx),
            });
         });

         await queryRunner.manager.save(skus);
         await queryRunner.commitTransaction();

         return {
            message: 'Tạo sản phẩm thành công',
            data: {
               ...savedSpu,
               sku_list: skus,
            },
         };
      } catch (error) {
         await queryRunner.rollbackTransaction();
         this.loggingService.logger.default.error('Lỗi khi tạo sản phẩm', error);
         throw new NotFoundException('Tạo sản phẩm không thành công');
      } finally {
         await queryRunner.release();
      }
   }

   async findOne(id: number) {
      const [spuInfo, skuList] = await Promise.all([
         this.spuRepo.findOne({
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
         }),
         this.skuRepo.find({
            where: {product_id: id, is_deleted: false},
            select: ['sku_id', 'sku_price', 'sku_stock', 'sku_default', 'sku_tier_idx'],
         }),
      ]);

      if (!spuInfo) {
         throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
      }

      const formattedSkuList = skuList.map((sku) => ({
         ...sku,
         sku_default: sku.sku_default === 1,
      }));

      return {
         message: `Lấy thông tin sản phẩm thành công`,
         data: {
            spu_info: spuInfo,
            sku_list: formattedSkuList,
         },
      };
   }

   async update({spu_id, payload, user}: {spu_id: number; payload: UpdateSpuDto; user: IUser}) {
      const {
         product_name,
         product_category,
         product_desc,
         product_variations,
         product_rating_avg,
         product_thumb,
         sku_list,
      } = payload;
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
         const [shop, product] = await Promise.all([
            this.shopService.findShopByOwnerId(user.usr_id),
            this.checkProductOwnership(spu_id),
         ]);

         if (!shop) {
            throw new NotFoundException('Không tìm thấy shop');
         }

         if (!product) {
            throw new NotFoundException('Không tìm thấy sản phẩm');
         }

         const hasValidData = this.validateSkuListCompleteness(product_variations ?? [], sku_list ?? []);
         if (!hasValidData.valid) {
            const {missing, extra} = hasValidData;
            const missingStr = missing.map((m) => m.join(',')).join(' | ');
            const extraStr = extra.map((e) => e.join(',')).join(' | ');
            throw new BadRequestException(
               `Danh sách SKU không hợp lệ: Thiếu các SKU: [${missingStr}] | Thừa các SKU: [${extraStr}]`,
            );
         }

         if (sku_list && Array.isArray(sku_list) && !!sku_list.length) {
            const hasDefaultSku = sku_list.some((sku) => sku.sku_default);
            if (!hasDefaultSku) {
               throw new BadRequestException('Phải có ít nhất 1 SKU mặc định');
            }
         }

         let product_slug = product.product_slug;
         if (product_name?.toLowerCase().trim() !== product.product_name.toLowerCase().trim()) {
            product_slug = this.generateProductSlug(product_name ?? product.product_name, shop.shop_id);
         }
         const defaultSku = sku_list?.find((sku) => sku.sku_default);
         await queryRunner.manager.update(
            Spu,
            {spu_id},
            {
               product_name: product_name ?? product.product_name,
               product_desc: product_desc ?? product.product_desc,
               product_slug,
               product_thumb: product_thumb ?? product.product_thumb,
               product_category: product_category ?? product.product_category,
               product_shop: shop.shop_id,
               product_price: defaultSku?.sku_price ?? product.product_price,
               product_quantity: defaultSku?.sku_stock ?? product.product_quantity,
               product_rating_avg: product_rating_avg ?? product.product_rating_avg,
               product_variations: JSON.stringify(product_variations ?? product.product_variations),
            },
         );

         const shouldUpdateVariations = this.isProductVariationsChanged(
            Array.isArray(product?.product_variations) ? product?.product_variations : [],
            product_variations ?? [],
         );

         if (shouldUpdateVariations) {
            // Xoá tất cả SKUs liên quan
            await queryRunner.manager.delete(Sku, {product_id: spu_id});
            // Cập nhật lại
            const skus = sku_list?.map((sku) => {
               return this.skuRepo.create({
                  sku_price: sku.sku_price,
                  sku_stock: sku.sku_stock,
                  sku_default: sku.sku_default ? 1 : 0,
                  product_id: spu_id,
                  sku_tier_idx: JSON.stringify(sku.sku_tier_idx),
               });
            });
            await queryRunner.manager.save(skus);
         }
         await queryRunner.commitTransaction();
         return {
            message: 'Cập nhật sản phẩm thành công',
            data: {
               spu_id,
               product_name: product_name ?? product.product_name,
               product_desc: product_desc ?? product.product_desc,
               product_slug,
               product_thumb: product_thumb ?? product.product_thumb,
               product_category: product_category ?? product.product_category,
               product_shop: shop.shop_id,
               product_price: defaultSku?.sku_price ?? product.product_price,
               product_quantity: defaultSku?.sku_stock ?? product.product_quantity,
               product_rating_avg: product_rating_avg ?? product.product_rating_avg,
               product_variations: JSON.stringify(product_variations ?? product.product_variations),
               sku_list,
            },
         };
      } catch (error) {
         await queryRunner.rollbackTransaction();
         this.loggingService.logger.default.error('Lỗi khi cập nhật sản phẩm', error);
         throw new NotFoundException(error.message || 'Cập nhật sản phẩm không thành công');
      } finally {
         await queryRunner.release();
      }
   }

   async remove(id: number) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
         const isExists = await this.spuRepo.count({
            where: {spu_id: id, is_deleted: false},
         });

         if (!isExists) {
            throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
         }

         await Promise.all([
            queryRunner.manager.update(Spu, {spu_id: id}, {is_deleted: true, deleted_at: new Date()}),
            queryRunner.manager.update(Sku, {product_id: id}, {is_deleted: true, deleted_at: new Date()}),
         ]);
         await queryRunner.commitTransaction();

         return {
            message: `Xoá sản phẩm thành công`,
            data: {spu_id: id},
         };
      } catch (error) {
         await queryRunner.rollbackTransaction();
         this.loggingService.logger.default.error('Lỗi khi xoá sản phẩm', error);
         throw new NotFoundException(error.message || 'Xoá sản phẩm không thành công');
      } finally {
         await queryRunner.release();
      }
   }

   /** REPOSITORIES */
   private async checkProductOwnership(spu_id: number) {
      const spu = await this.spuRepo.findOne({
         where: {spu_id, is_deleted: false},
      });
      if (!spu) {
         return null;
      }
      return spu;
   }

   private generateProductSlug(product_name: string, shop_id: number) {
      const product_slug = generateSlugify(product_name);
      const timestamp = Math.floor(new Date().getTime() / 1000);
      return `${product_slug}-${shop_id}-${timestamp}`;
   }

   private validateSkuListCompleteness(product_variations: ProductVariationsType[], sku_list: SkuItemType[]) {
      if (
         !Array.isArray(product_variations) ||
         !Array.isArray(sku_list) ||
         !product_variations.length ||
         !sku_list.length
      ) {
         return {valid: false, missing: [], extra: []};
      }

      // Generate all valid combinations from product_variations
      const ranges = product_variations.map((v) => Array.from({length: v.options.length}, (_, i) => i));

      const validCombinations = this.cartesianProduct(ranges);

      const validSet = new Set(validCombinations.map((c) => c.join(',')));
      const actualSet = new Set(sku_list.map((sku) => sku.sku_tier_idx.join(',')));

      // Tìm thiếu
      const missing = Array.from(validSet)
         .filter((combo) => !actualSet.has(combo))
         .map((str) => str.split(',').map(Number));

      // Tìm thừa
      const extra = Array.from(actualSet)
         .filter((combo) => !validSet.has(combo))
         .map((str) => str.split(',').map(Number));

      return {
         valid: missing.length === 0 && extra.length === 0,
         missing,
         extra,
      };
   }

   /**
    * Tính tích Descartes của mảng các mảng số
    * @param arr Mảng các mảng số
    * @returns Mảng chứa tất cả các kết hợp có thể
    */
   private cartesianProduct(arr: number[][]) {
      /**
       * Lượt 1: VD curr = [0, 1] — màu sắc
       * acc = [[]] , curr = [0, 1]
       * -> acc.flatMap(a => curr.map(b => [...a, b])) -> [[]].flatMap(a => [ [0], [1] ]) = [[0], [1]]
       * Lượt 2: VD curr = [0, 1] — kích thước
       * acc = [[0], [1]], curr = [0, 1]
       * -> acc.flatMap(a => curr.map(b => [...a, b])) -> [[0], [1]].flatMap(a => [ [0, 0], [0, 1], [1, 0], [1, 1] ]) = [[0, 0], [0, 1], [1, 0], [1, 1]]
       */
      return arr.reduce<number[][]>((acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])), [[]]);
   }

   private isProductVariationsChanged(fromDB: ProductVariationsType[], fromClient: ProductVariationsType[]) {
      const dbMap = new Map<string, Set<string>>();
      for (const v of fromDB) {
         dbMap.set(v.name, new Set(v.options));
      }
      for (const clientVar of fromClient) {
         const dbOptions = dbMap.get(clientVar.name);
         if (!dbOptions) {
            // client có variation mới mà DB không có
            return true;
         }
         const clientOptionsSet = new Set(clientVar.options);
         // So sánh số lượng options
         if (clientOptionsSet.size !== dbOptions.size) {
            return true;
         }
         // So sánh từng option
         for (const opt of clientOptionsSet) {
            if (!dbOptions.has(opt)) {
               return true;
            }
         }
      }
      // Check nếu DB có variation mà client không gửi lên (bị xoá)
      for (const dbVar of fromDB) {
         if (!fromClient.find((v) => v.name === dbVar.name)) {
            return true;
         }
      }
      return false;
   }

   /** CÁC PHƯƠNG THỨC DÙNG ĐỂ TEST */
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
