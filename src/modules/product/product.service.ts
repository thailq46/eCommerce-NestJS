import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { RedisService } from 'src/base/db/redis/redis.service';
import { LoggingService } from 'src/base/logging';
import { generateSlugify } from 'src/base/utils/functions';
import { OptionValue } from 'src/modules/option-value/entities/option-value.entity';
import { Option } from 'src/modules/option/entities/option.entity';
import { ProductVariantOptionValue } from 'src/modules/product-variant-option-value/entities/product-variant-option-value.entity';
import { ProductVariant } from 'src/modules/product-variant/entities/product-variant.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { ProductDataQuery, ProductTransformedResult, ProductVariantType } from 'src/modules/product/types';
import { Shop } from 'src/modules/shop/entities/shop.entity';
import { IUser } from 'src/modules/user/types';
import { DataSource, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
   TTL: number = 5 * 60 * 1000; // 5pp

   constructor(
      @InjectRepository(Product)
      private readonly productRepo: Repository<Product>,
      private readonly dataSource: DataSource,
      private readonly loggingService: LoggingService,
      private readonly redisService: RedisService,
      @Inject(CACHE_MANAGER)
      private readonly cacheManager: Cache,
   ) {}

   async createProduct({ dto, user }: { dto: CreateProductDto; user: IUser }) {
      try {
         const newProduct = await this.dataSource.transaction(async (tx) => {
            // 1. Tạo SPU (Sản phẩm chính)
            const shop = await tx.findOne(Shop, {
               where: { owner_id: user.usr_id, is_deleted: false },
            });
            if (!shop) {
               throw new NotFoundException('Shop not found for the user');
            }
            const product = tx.create(Product, {
               name: dto.name,
               description: dto.description,
               slug: this.generateProductSlug(dto.name, shop.shop_id),
               thumbnail: dto.thumbnail,
               shop_id: shop.shop_id,
               category_id: dto.category_id,
               rating_avg: dto.rating_avg || 0,
            });
            const savedProduct = await tx.save(product);
            // 2. Lặp qua từng biến thể (SKU) được gửi lên
            for (const variantDto of dto.variants) {
               // Mảng để chứa dữ liệu cho bảng join, sẽ được dùng ở bước 4
               const variantOptionsForJoinTable: { optionValueId: number }[] = [];
               // 3. Với mỗi option của SKU (ví dụ: Color: Blue), tìm hoặc tạo (upsert)
               for (const optionDto of variantDto.options) {
                  // 3.1 Check if the option already exists
                  let option = await tx.findOne(Option, {
                     where: { name: optionDto.optionName.trim() },
                  });
                  if (!option) {
                     option = tx.create(Option, {
                        name: optionDto.optionName.trim(),
                     });
                     await tx.save(option);
                  }
                  // 3.2 Check option value
                  let optionValue = await tx.findOne(OptionValue, {
                     where: {
                        option_id: option.id,
                        value: optionDto.optionValue.trim(),
                     },
                  });
                  if (!optionValue) {
                     optionValue = tx.create(OptionValue, {
                        option_id: option.id,
                        value: optionDto.optionValue.trim(),
                     });
                     await tx.save(optionValue);
                  }
                  // 3.3 Add to join table data
                  variantOptionsForJoinTable.push({ optionValueId: optionValue.id });
               }
               // 4. Tạo SKU (Product Variant) với các option đã tìm hoặc tạo
               const productVariant = tx.create(ProductVariant, {
                  product_id: savedProduct.id,
                  sku: variantDto.sku,
                  price: variantDto.price,
                  stock_quantity: variantDto.stockQuantity,
               });
               const savedVariant = await tx.save(productVariant);
               // 5. Lưu các option value vào bảng join
               for (const variantOption of variantOptionsForJoinTable) {
                  const productVariantOptionValue = tx.create(ProductVariantOptionValue, {
                     product_variant_id: savedVariant.id,
                     option_value_id: variantOption.optionValueId,
                  });
                  await tx.save(productVariantOptionValue);
               }
            }
            return savedProduct;
         });
         return {
            message: 'Product created successfully',
            data: newProduct,
         };
      } catch (error) {
         this.loggingService.getLogger(ProductService.name).error('Error creating product', error);
         throw new BadRequestException('Error creating product');
      }
   }

   async findOne(id: number) {
      const resourceId = Date.now().toString();
      const KEY_CACHE = `PRO_ITEM:${id}`,
         KEY_LOCK = `PRO_LOCK:${id}`;
      // 1. Check cache
      const cachedData = await this.redisService.get(KEY_CACHE);
      if (cachedData) {
         this.loggingService
            .getLogger(ProductService.name)
            .log(`FROM CACHE: ${id} ----- ${Date.now()} ----- ${cachedData}`);
         return {
            message: 'Product found in cache',
            data: JSON.parse(cachedData),
         };
      }
      try {
         // 2. Acquire lock
         const isLocked = await this.redisService.tryLock({
            waitTime: 1,
            leaseTime: 5,
            unit: 'seconds',
            keyLock: KEY_LOCK,
            value: resourceId,
         });
         if (!isLocked) {
            this.loggingService
               .getLogger(ProductService.name)
               .debug(`[${resourceId}] Could not acquire lock for product ID ${id}, waiting before retry...`);
            return {
               message: `Đang chờ lấy khóa cho sản phẩm với ID ${id}, vui lòng thử lại sau`,
            };
         }
         // 3. Double-check cache after acquiring lock
         const cachedDataAfterLock = await this.redisService.get(KEY_CACHE);
         if (cachedDataAfterLock) {
            this.loggingService
               .getLogger(ProductService.name)
               .log(`FROM CACHE AFTER LOCK: ${id} ----- ${Date.now()} ----- ${cachedDataAfterLock}`);
            return {
               message: 'Product found in cache after lock',
               data: JSON.parse(cachedDataAfterLock),
            };
         }
         // 4. Fetch from database
         const result = await this.productRepo
            .createQueryBuilder('p')
            .select([
               'p.name AS name',
               'p.description AS description',
               'p.rating_avg AS rating_avg',
               'p.category_id AS category_id',
               'p.slug AS slug',
               'p.thumbnail AS thumbnail',
               'p.shop_id AS shop_id',
               'pv.id AS variant_id',
               'pv.sku AS sku',
               'pv.price AS price',
               'pv.stock_quantity AS stock_quantity',
               'o.name AS option_name',
               'ov.value AS option_value',
            ])
            .leftJoin(ProductVariant, 'pv', 'pv.product_id = p.id AND pv.is_deleted = false')
            .leftJoin(ProductVariantOptionValue, 'pvov', 'pvov.product_variant_id = pv.id')
            .leftJoin(OptionValue, 'ov', 'ov.id = pvov.option_value_id AND ov.is_deleted = false')
            .leftJoin(Option, 'o', 'o.id = ov.option_id AND o.is_deleted = false')
            .where('p.id = :id', { id })
            .andWhere('p.is_deleted = false')
            .orderBy('pv.id', 'ASC')
            .getRawMany();

         if (!result || result.length === 0) {
            throw new NotFoundException('Product not found');
         }
         // Chuyển đổi dữ liệu
         const transformedResult = this.transformQueryResult(result);
         await this.redisService.set({
            key: KEY_CACHE,
            value: JSON.stringify(transformedResult),
         });
         this.loggingService
            .getLogger(ProductService.name)
            .log(`FROM DBS: ${id} ----- ${Date.now()} ----- ${JSON.stringify(transformedResult)}`);
         return {
            message: 'Product found in database',
            data: transformedResult,
         };
      } catch (error) {
         this.loggingService.getLogger(ProductService.name).error(`Error finding product with id ${id}`, error);
         throw new NotFoundException(`Product with id ${id} not found`);
      } finally {
         await this.redisService.unlock(KEY_LOCK);
      }
   }

   /**
    * Nếu dùng MircoService thì hàm getProductLocalCache sẽ có vấn đề về tính nhất quán dữ liệu giữa các service.(Giữa LocalCache với Distributed Cache)
    * Cách test:
    * - Set up Nginx để load balance giữa các instance của app
    * - Build xong dùng PM2 hoặc Node để chạy thành 2 PROT khác nhau
    *  + With PM2
    *        PORT=3006 pm2 start dist/src/main.js --name app-3006 --update-env
    *        PORT=3005 pm2 start dist/src/main.js --name app-3005 --update-env
    *  + With Node
    *       PORT=3005 node dist/src/main.js
    *       PORT=3006 node dist/src/main.js
    * - Gửi request đến 2 instance khác nhau đến khi data đc get từ LocalCache ra xong request api order để trừ stock đến 1 trong 2 instance đó. xong getProductLocalCache lại sẽ thấy dữ liệu không nhất quán giữa LocalCache và Redis.
    */
   async getProductLocalCache(id: number) {
      const resourceId = Date.now().toString();
      const KEY_CACHE = `PRO_ITEM:${id}`,
         KEY_LOCK = `PRO_LOCK:${id}`;
      try {
         // 1. Get product from local cache
         const productLocalCache: undefined | ProductTransformedResult = await this.cacheManager.get(KEY_CACHE);
         if (productLocalCache) {
            this.loggingService
               .getLogger(ProductService.name)
               .log(`FROM LOCAL CACHE: ${id} ----- ${Date.now()} ----- ${JSON.stringify(productLocalCache)}`);
            return {
               message: 'Product found in local cache',
               data: productLocalCache,
            };
         }
         // 2. Check cache
         const cachedData = await this.redisService.get(KEY_CACHE);
         if (cachedData) {
            this.loggingService
               .getLogger(ProductService.name)
               .log(`FROM CACHE: ${id} ----- ${Date.now()} ----- ${cachedData}`);
            // 2.1 Set local cache với object, không phải string
            await this.cacheManager.set(KEY_CACHE, JSON.parse(cachedData), this.TTL);
            return {
               message: 'Product found in cache',
               data: JSON.parse(cachedData),
            };
         }
         // 2. Acquire lock
         const isLocked = await this.redisService.tryLock({
            waitTime: 1,
            leaseTime: 5,
            unit: 'seconds',
            keyLock: KEY_LOCK,
            value: resourceId,
         });
         if (!isLocked) {
            this.loggingService
               .getLogger(ProductService.name)
               .warn(`[${resourceId}] Could not acquire lock for product ID ${id}, waiting before retry...`);
            return {
               message: `Đang chờ lấy khóa cho sản phẩm với ID ${id}, vui lòng thử lại sau`,
            };
         }
         // 3. Double-check cache after acquiring lock
         const cachedDataAfterLock = await this.redisService.get(KEY_CACHE);
         if (cachedDataAfterLock) {
            this.loggingService
               .getLogger(ProductService.name)
               .log(`FROM CACHE AFTER LOCK: ${id} ----- ${Date.now()} ----- ${cachedDataAfterLock}`);

            const parsedData = JSON.parse(cachedDataAfterLock);
            // 3.1 Set local cache với object
            await this.cacheManager.set(KEY_CACHE, parsedData, this.TTL);
            return {
               message: 'Product found in cache after lock',
               data: parsedData,
            };
         }
         // 4. Fetch from database
         const result = await this.productRepo
            .createQueryBuilder('p')
            .select([
               'p.name AS name',
               'p.description AS description',
               'p.rating_avg AS rating_avg',
               'p.category_id AS category_id',
               'p.slug AS slug',
               'p.thumbnail AS thumbnail',
               'p.shop_id AS shop_id',
               'pv.id AS variant_id',
               'pv.sku AS sku',
               'pv.price AS price',
               'pv.stock_quantity AS stock_quantity',
               'o.name AS option_name',
               'ov.value AS option_value',
            ])
            .leftJoin(ProductVariant, 'pv', 'pv.product_id = p.id AND pv.is_deleted = false')
            .leftJoin(ProductVariantOptionValue, 'pvov', 'pvov.product_variant_id = pv.id')
            .leftJoin(OptionValue, 'ov', 'ov.id = pvov.option_value_id AND ov.is_deleted = false')
            .leftJoin(Option, 'o', 'o.id = ov.option_id AND o.is_deleted = false')
            .where('p.id = :id', { id })
            .andWhere('p.is_deleted = false')
            .orderBy('pv.id', 'ASC')
            .getRawMany();

         if (!result || result.length === 0) {
            await Promise.all([
               this.cacheManager.set(KEY_CACHE, null),
               this.redisService.set({ key: KEY_CACHE, value: null }),
            ]);
            throw new NotFoundException('Product not found');
         }
         // Chuyển đổi dữ liệu
         const transformedResult = this.transformQueryResult(result);
         await Promise.all([
            this.redisService.set({
               key: KEY_CACHE,
               value: JSON.stringify(transformedResult),
            }),
            this.cacheManager.set(KEY_CACHE, transformedResult, this.TTL),
         ]);
         this.loggingService
            .getLogger(ProductService.name)
            .log(`FROM DBS: ${id} ----- ${Date.now()} ----- ${JSON.stringify(transformedResult)}`);
         return {
            message: 'Product found in database',
            data: transformedResult,
         };
      } catch (error) {
         this.loggingService.getLogger(ProductService.name).error(`Error finding product with id ${id}`, error);
         throw new NotFoundException(`Product with id ${id} not found`);
      } finally {
         await this.redisService.unlock(KEY_LOCK);
      }
   }

   // Additional methods can be added here as needed
   private generateProductSlug(product_name: string, shop_id: number) {
      const product_slug = generateSlugify(product_name);
      const timestamp = Math.floor(new Date().getTime() / 1000);
      return `${product_slug}-${shop_id}-${timestamp}`;
   }

   private transformQueryResult(data: ProductDataQuery): ProductTransformedResult | { message: string; data: null } {
      if (!data || data.length === 0) {
         return {
            message: 'No product found',
            data: null,
         };
      }
      const productData = data[0];
      const variantsMap = new Map<number, ProductVariantType>();
      data.forEach((row) => {
         const variantId = row.variant_id;
         // Nếu variant_id null thì skip (trường hợp product không có variants)
         if (!variantId) return;
         if (!variantsMap.has(variantId)) {
            variantsMap.set(variantId, {
               sku: row.sku,
               price: Number(row.price),
               stock_quantity: Number(row.stock_quantity),
               options: [],
            });
         }
         // Chỉ thêm option nếu có dữ liệu option
         if (row.option_name && row.option_value) {
            const variant = variantsMap.get(variantId);
            // Kiểm tra duplicate option để tránh thêm trùng
            const existingOption = variant?.options.find(
               (opt) => opt.option_name === row.option_name && opt.option_value === row.option_value,
            );
            if (!existingOption) {
               variant?.options.push({
                  option_name: row.option_name,
                  option_value: row.option_value,
               });
            }
         }
      });
      return {
         name: productData.name,
         description: productData.description,
         rating_avg: parseFloat(productData.rating_avg) || 0,
         category_id: parseInt(productData.category_id),
         shop_id: productData.shop_id,
         slug: productData.slug,
         thumbnail: productData.thumbnail,
         variants: Array.from(variantsMap.values()),
      };
   }
}
