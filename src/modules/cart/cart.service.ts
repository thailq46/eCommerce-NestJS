import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuerySpecificationDto } from 'src/base/shared/dto/query-specification.dto';
import { QuantityAction } from 'src/modules/cart/types';
import { OptionValue } from 'src/modules/option-value/entities/option-value.entity';
import { Option } from 'src/modules/option/entities/option.entity';
import { ProductVariantOptionValue } from 'src/modules/product-variant-option-value/entities/product-variant-option-value.entity';
import { ProductVariant } from 'src/modules/product-variant/entities/product-variant.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { Repository } from 'typeorm';
import { LoggingService } from '../../base/logging';
import { IUser } from '../user/types';
import { CreateCartDto, UpdateCartQuantityDto } from './dto/create-cart.dto';
import { Cart } from './entities/cart.entity';

@Injectable()
export class CartService {
   constructor(
      @InjectRepository(Cart)
      private readonly cartRepo: Repository<Cart>,
      private readonly logService: LoggingService,
   ) {}

   async createCart({ data, user }: { data: CreateCartDto; user: IUser }) {
      try {
         const cart = await this.cartRepo.manager.transaction(async (tx) => {
            const { product_id, quantity, product_variant_id, price } = data;
            const [cartItem, productVariant] = await Promise.all([
               tx.findOne(Cart, { where: { user_id: user.usr_id, product_id } }),
               tx.findOne(ProductVariant, { where: { id: product_variant_id, product_id, is_deleted: false } }),
            ]);
            if (!productVariant) {
               throw new NotFoundException('Thuộc tính sản phẩm không tồn tại');
            }
            if (price !== Number(productVariant.price)) {
               throw new BadRequestException('Giá sản phẩm không hợp lệ');
            }
            if (cartItem) {
               // Nếu giỏ hàng đã tồn tại, cập nhật số lượng
               const productVariantStock = productVariant.stock_quantity;
               const totalQuantity = cartItem.quantity + quantity;
               if (totalQuantity > productVariantStock) {
                  throw new BadRequestException('Số lượng sản phẩm trong giỏ hàng vượt quá số lượng tồn kho');
               }
               cartItem.quantity = totalQuantity;
               await tx.save(cartItem);
               return cartItem;
            } else {
               // Nếu giỏ hàng chưa tồn tại, tạo mới
               const newCart = tx.create(Cart, {
                  user_id: user.usr_id,
                  product_id,
                  quantity,
                  product_variant_id,
                  price,
               });
               await tx.save(newCart);
               return newCart;
            }
         });
         return {
            message: 'Tạo giỏ hàng thành công',
            data: cart,
         };
      } catch (e) {
         this.logService.getLogger(Cart.name).error(e?.message ?? 'Tạo giỏ hàng thất bại', e);
         if (e instanceof NotFoundException || e instanceof BadRequestException) {
            throw e;
         }
         throw new InternalServerErrorException('Đã xảy ra lỗi khi tạo giỏ hàng');
      }
   }

   async findOne({ cart_id, user }: { cart_id: number; user: IUser }) {
      try {
         const cartItem = await this.cartRepo
            .createQueryBuilder('c')
            .where('c.cart_id = :cart_id', { cart_id })
            .andWhere('c.user_id = :user_id', { user_id: user.usr_id })
            .leftJoin(Product, 'p', 'c.product_id = p.id')
            .leftJoin(ProductVariant, 'pv', 'c.product_variant_id = pv.id AND c.product_id = pv.product_id')
            .leftJoin(ProductVariantOptionValue, 'pvov', 'pvov.product_variant_id = pv.id')
            .leftJoin(OptionValue, 'ov', 'ov.id = pvov.option_value_id AND ov.is_deleted = false')
            .leftJoin(Option, 'o', 'o.id = ov.option_id AND o.is_deleted = false')
            .select([
               'c.*',
               'p.name AS product_name',
               'p.thumbnail AS product_thumb',
               'pv.sku AS product_attribute',
               'pv.stock AS product_stock',
               'o.name AS option_name',
               'ov.value AS option_value',
            ])
            .getRawMany();

         if (!cartItem) {
            throw new NotFoundException('Sản phẩm không tồn tại trong giỏ hàng');
         }

         const productData = cartItem[0];
         const productVariants = new Map();

         cartItem.forEach((item) => {
            const variantKey = `${item.product_variant_id}-${item.product_id}`;
            if (!productVariants.has(variantKey)) {
               productVariants.set(variantKey, {
                  product_variant_id: item.product_variant_id,
                  sku: item.product_attribute,
                  stock: item.product_stock,
                  options: [],
               });
            }
            if (item.option_name && item.option_value) {
               productVariants.get(variantKey).options.push({
                  name: item.option_name,
                  value: item.option_value,
               });
            }
         });
         const formattedCartItem = {
            cart_id: productData.cart_id,
            user_id: productData.user_id,
            product_id: productData.product_id,
            product_name: productData.product_name,
            product_thumb: productData.product_thumb,
            quantity: productData.quantity,
            price: Number(productData.price),
            product_variants: Array.from(productVariants.values()),
         };
         return {
            message: 'Lấy chi tiết giỏ hàng thành công',
            data: formattedCartItem,
         };
      } catch (e) {
         this.logService.logger.default.error(e?.message ?? 'Lấy chi tiết giỏ hàng thất bại', e);
         throw e;
      }
   }

   async findAllCartByUser({ user, query }: { user: IUser; query: QuerySpecificationDto }) {
      try {
         const { page = 1, limit = 10 } = query;
         const offset = (page - 1) * limit;

         const totalCount = await this.cartRepo
            .createQueryBuilder('c')
            .where('c.user_id = :user_id', { user_id: user.usr_id })
            .getCount();

         if (totalCount === 0) {
            return {
               message: 'Giỏ hàng trống',
               data: {
                  data: [],
                  meta: {
                     page,
                     limit,
                     total: 0,
                     totalPages: 0,
                  },
               },
            };
         }

         const cartItems = await this.cartRepo
            .createQueryBuilder('c')
            .where('c.user_id = :user_id', { user_id: user.usr_id })
            .leftJoin(Product, 'p', 'c.product_id = p.id AND p.is_deleted = false')
            .leftJoin(
               ProductVariant,
               'pv',
               'c.product_variant_id = pv.id AND c.product_id = pv.product_id AND pv.is_deleted = false',
            )
            .leftJoin(ProductVariantOptionValue, 'pvov', 'pvov.product_variant_id = pv.id')
            .leftJoin(OptionValue, 'ov', 'ov.id = pvov.option_value_id AND ov.is_deleted = false')
            .leftJoin(Option, 'o', 'o.id = ov.option_id AND o.is_deleted = false')
            .select([
               'c.cart_id AS cart_id',
               'c.user_id AS user_id',
               'c.product_id AS product_id',
               'c.quantity AS quantity',
               'c.price AS price',
               'c.product_variant_id AS product_variant_id',
               'c.created_at AS created_at',
               'c.updated_at AS updated_at',
               'p.name AS product_name',
               'p.thumbnail AS product_thumb',
               'p.slug AS product_slug',
               'pv.sku AS product_attribute',
               'pv.stock_quantity AS product_stock',
               'o.name AS option_name',
               'ov.value AS option_value',
            ])
            .orderBy('c.created_at', 'DESC')
            .limit(limit)
            .offset(offset)
            .getRawMany();

         const cartMap = new Map();

         cartItems.forEach((item) => {
            const cartId = item.cart_id;
            if (!cartMap.has(cartId)) {
               cartMap.set(cartId, {
                  cart_id: item.cart_id,
                  user_id: item.user_id,
                  product_id: item.product_id,
                  product_name: item.product_name,
                  product_thumb: item.product_thumb,
                  product_slug: item.product_slug,
                  quantity: item.quantity,
                  price: Number(item.price),
                  product_variants: {
                     product_variant_id: item.product_variant_id,
                     sku: item.product_attribute,
                     stock: item.product_stock,
                     options: [],
                  },
               });
            }
            if (item.option_name && item.option_value) {
               const cartItem = cartMap.get(cartId);
               const existingOption = cartItem.product_variants.options.find(
                  (opt) => opt.name === item.option_name && opt.value === item.option_value,
               );
               if (!existingOption) {
                  cartItem.product_variants.options.push({
                     name: item.option_name,
                     value: item.option_value,
                  });
               }
            }
         });

         const formattedCartItems = Array.from(cartMap.values());
         const totalPages = Math.ceil(totalCount / limit);

         return {
            message: 'Lấy danh sách giỏ hàng thành công',
            data: {
               data: formattedCartItems,
               meta: {
                  page: Number(page),
                  limit: Number(limit),
                  total: totalCount,
                  totalPages,
                  hasNext: page < totalPages,
                  hasPrev: page > 1,
               },
            },
         };
      } catch (e) {
         this.logService.getLogger(Cart.name).error(e?.message ?? 'Lấy danh sách giỏ hàng thất bại', e);
         if (e instanceof NotFoundException || e instanceof BadRequestException) {
            throw e;
         }
         throw new InternalServerErrorException('Đã xảy ra lỗi khi lấy danh sách giỏ hàng');
      }
   }

   async updateQuantity({ cart_id, payload, user }: { cart_id: number; payload: UpdateCartQuantityDto; user: IUser }) {
      try {
         const cart = await this.cartRepo.manager.transaction(async (tx) => {
            const { action } = payload;
            const cartItem = await tx.findOne(Cart, {
               where: { cart_id, user_id: user.usr_id },
            });
            if (!cartItem) {
               throw new NotFoundException('Sản phẩm không tồn tại trong giỏ hàng');
            }
            const productVariant = await tx.findOne(ProductVariant, {
               where: { id: cartItem.product_variant_id, product_id: cartItem.product_id, is_deleted: false },
            });
            if (!productVariant) {
               throw new NotFoundException('Thuộc tính sản phẩm không tồn tại');
            }
            if (action === QuantityAction.INCREMENT) {
               if (cartItem.quantity + 1 > productVariant.stock_quantity) {
                  throw new BadRequestException('Số lượng sản phẩm vượt quá số lượng tồn kho');
               }
               cartItem.quantity += 1;
            } else if (action === QuantityAction.DECREMENT) {
               if (cartItem.quantity <= 1) {
                  // Nếu số lượng là 1 và muốn giảm, xóa sản phẩm khỏi giỏ hàng
                  await tx.remove(cartItem);
                  return null; // Trả về null để biết đã xóa sản phẩm
               }
               cartItem.quantity -= 1;
            }
            if (cartItem.quantity > 0) {
               await tx.save(cartItem);
            }
            return cartItem;
         });
         if (cart === null) {
            return {
               message: 'Đã xóa sản phẩm khỏi giỏ hàng',
               data: null,
            };
         }
         return {
            message: 'Cập nhật số lượng thành công',
            data: cart,
         };
      } catch (e) {
         this.logService.getLogger(Cart.name).error(e?.message ?? 'Cập nhật số lượng thất bại', e);
         if (e instanceof NotFoundException || e instanceof BadRequestException) {
            throw e;
         }
         throw new InternalServerErrorException('Đã xảy ra lỗi khi cập nhật số lượng sản phẩm');
      }
   }

   async removeCart({ cart_id, user }: { cart_id: number; user: IUser }) {
      try {
         const result = await this.cartRepo.manager.transaction(async (tx) => {
            const cartItem = await tx.findOne(Cart, {
               where: { cart_id, user_id: user.usr_id },
            });
            if (!cartItem) {
               throw new NotFoundException('Sản phẩm không tồn tại trong giỏ hàng');
            }
            await tx.remove(cartItem);
            return {
               cart_id,
               product_id: cartItem.product_id,
               removed: true,
            };
         });
         return {
            message: 'Đã xóa sản phẩm khỏi giỏ hàng',
            data: result,
         };
      } catch (e) {
         this.logService.getLogger(Cart.name).error(e?.message ?? 'Xóa sản phẩm khỏi giỏ hàng thất bại', e);
         if (e instanceof NotFoundException) {
            throw e;
         }
         throw new BadRequestException('Đã xảy ra lỗi khi xóa sản phẩm khỏi giỏ hàng');
      }
   }
}
