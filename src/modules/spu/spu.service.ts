import {BadRequestException, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
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

   async createV2(payload: CreateSpuDto, user: IUser) {
      try {
         const newProduct = await this.dataSource.transaction(async (transactionalEntityManager) => {
            const shop = await this.shopService.findShopByOwnerId(user.usr_id);
            if (!shop) {
               throw new NotFoundException('Không tìm thấy shop');
            }

            const {product_variations, sku_list, product_name} = payload;

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

            const defaultSku = sku_list.find((sku) => sku.sku_default);

            const spu = transactionalEntityManager.create(Spu, {
               ...payload,
               product_slug: this.generateProductSlug(product_name, shop.shop_id),
               product_shop: shop.shop_id,
               product_price: defaultSku?.sku_price || 0,
               product_quantity: defaultSku?.sku_stock || 0,
               product_variations: JSON.stringify(product_variations),
            });
            const savedSpu = await transactionalEntityManager.save(spu);

            const skusToCreate = sku_list.map((sku) => {
               return transactionalEntityManager.create(Sku, {
                  sku_price: sku.sku_price,
                  sku_stock: sku.sku_stock,
                  sku_default: sku.sku_default ? 1 : 0,
                  product_id: savedSpu.spu_id,
                  sku_tier_idx: JSON.stringify(sku.sku_tier_idx),
               });
            });
            const savedSkus = await transactionalEntityManager.save(skusToCreate);

            return {
               ...savedSpu,
               sku_list: savedSkus,
            };
         });

         return {
            message: 'Tạo sản phẩm thành công',
            data: newProduct,
         };
      } catch (error) {
         this.loggingService.logger.default.error('Lỗi khi tạo sản phẩm', error);
         // dataSource.transaction đã tự động rollback rồi
         throw new InternalServerErrorException('Tạo sản phẩm không thành công');
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

   async updateV2({spu_id, payload, user}: {spu_id: number; payload: UpdateSpuDto; user: IUser}) {
      try {
         const updatedData = await this.dataSource.transaction(async (manager) => {
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

            const {product_variations, sku_list, product_name} = payload;

            const hasValidData = this.validateSkuListCompleteness(product_variations ?? [], sku_list ?? []);
            if (!hasValidData.valid) {
               const {missing, extra} = hasValidData;
               const missingStr = missing.map((m) => m.join(',')).join(' | ');
               const extraStr = extra.map((e) => e.join(',')).join(' | ');
               throw new BadRequestException(
                  `Danh sách SKU không hợp lệ: Thiếu SKU: [${missingStr}] | Thừa SKU: [${extraStr}]`,
               );
            }

            if (Array.isArray(sku_list) && sku_list?.length) {
               if (!sku_list.some((sku) => sku.sku_default)) {
                  throw new BadRequestException('Phải có ít nhất 1 SKU mặc định');
               }
            }

            const defaultSku = sku_list?.find((sku) => sku.sku_default);

            const updatedSpuData = {
               ...payload,
               product_slug: product.product_slug,
               product_price: defaultSku?.sku_price ?? product.product_price,
               product_quantity: defaultSku?.sku_stock ?? product.product_quantity,
               product_variations: JSON.stringify(product_variations ?? product.product_variations),
            };

            if (product_name && product_name.trim().toLowerCase() !== product.product_name.trim().toLowerCase()) {
               updatedSpuData.product_slug = this.generateProductSlug(product_name, shop.shop_id);
            }

            await manager.update(Spu, {spu_id}, updatedSpuData);

            // Kiểm tra và cập nhật SKU nếu cần
            const shouldUpdateVariations = this.isProductVariationsChanged(
               Array.isArray(product?.product_variations) ? product.product_variations : [],
               product_variations ?? [],
            );

            let finalSkuList = await this.skuRepo.findBy({product_id: spu_id});

            if (shouldUpdateVariations) {
               // Xóa tất cả SKU cũ
               await manager.delete(Sku, {product_id: spu_id});
               // Tạo và lưu các SKU mới
               const skusToCreate =
                  sku_list?.map((sku) => {
                     return manager.create(Sku, {
                        ...sku,
                        sku_default: sku.sku_default ? 1 : 0,
                        product_id: spu_id,
                        sku_tier_idx: JSON.stringify(sku.sku_tier_idx),
                     });
                  }) ?? [];

               if (skusToCreate.length > 0) {
                  finalSkuList = await manager.save(skusToCreate);
               } else {
                  finalSkuList = [];
               }
            }

            return {...updatedSpuData, sku_list: finalSkuList};
         });

         return {
            message: 'Cập nhật sản phẩm thành công',
            data: updatedData,
         };
      } catch (error) {
         this.loggingService.logger.default.error('Lỗi khi cập nhật sản phẩm', error);
         throw new InternalServerErrorException('Cập nhật sản phẩm không thành công');
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
}
