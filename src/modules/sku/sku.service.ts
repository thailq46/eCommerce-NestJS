import {BadRequestException, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {RedisService} from 'src/base/db/redis/redis.service';
import {LoggingService} from 'src/base/logging';
import {Sku} from 'src/modules/sku/entities/sku.entity';
import {Repository} from 'typeorm';

@Injectable()
export class SkuService {
   constructor(
      @InjectRepository(Sku)
      private readonly skuRepo: Repository<Sku>,
      private readonly redisService: RedisService,
      private readonly loggingService: LoggingService,
   ) {}

   async findOneSku({sku_id, product_id}: {sku_id: number; product_id: number}) {
      try {
         const SKU_CACHE_KEY = `sku-k-${sku_id}`;
         // Read Cache
         const skuCache = await this.redisService.get(SKU_CACHE_KEY);
         if (skuCache) {
            return {
               message: 'Lấy thông tin sku thành công',
               data: {
                  ...JSON.parse(skuCache),
                  to_load: 'cache',
               },
            };
         }
         // Read DB if not exist cache
         if (!skuCache) {
            const sku = await this.skuRepo.findOne({
               where: {sku_id, product_id, is_deleted: false},
               select: ['sku_id', 'sku_tier_idx', 'sku_default', 'sku_sort', 'sku_price', 'sku_stock', 'product_id'],
            });

            if (!sku) {
               throw new BadRequestException(`Không tìm thấy sku với sku_id: ${sku_id} và product_id: ${product_id}`);
            }

            const cleanSku = sku ? Object.fromEntries(Object.entries(sku).filter(([_, v]) => v !== undefined)) : null;

            const valueCache = sku ? cleanSku : null;

            this.redisService
               .setCacheWithExpireTime({
                  key: SKU_CACHE_KEY,
                  value: valueCache !== null ? JSON.stringify(valueCache) : null,
                  expireTime: 30,
               })
               .then()
               .catch((e) => {
                  this.loggingService.logger.default.error('SkuService ~ findOneSku ~ redis error', e);
               });

            return {
               message: 'Lấy thông tin sku thành công',
               data: {
                  ...valueCache,
                  to_load: 'dbs',
               },
            };
         }
      } catch (error) {
         this.loggingService.logger.default.error('SkuService ~ findOneSku ~ error', error);
         return {
            message: `Lấy thông tin sku không thành công`,
            data: null,
         };
      }
   }
}
