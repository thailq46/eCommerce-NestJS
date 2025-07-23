import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuantityAction } from 'src/modules/cart/types';
import { Sku } from 'src/modules/sku/entities/sku.entity';
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
            const { product_id, quantity, sku_id, price } = data;
            const [cartItem, skuItem] = await Promise.all([
               tx.findOne(Cart, { where: { user_id: user.usr_id, product_id } }),
               tx.findOne(Sku, { where: { sku_id, product_id, is_deleted: false } }),
            ]);

            if (!skuItem) {
               throw new NotFoundException('Thuộc tính sản phẩm không tồn tại');
            }

            if (price !== Number(skuItem.sku_price)) {
               throw new BadRequestException('Giá sản phẩm không hợp lệ');
            }
            if (cartItem) {
               // Nếu giỏ hàng đã tồn tại, cập nhật số lượng
               const skuStock = skuItem.sku_stock;
               const totalQuantity = cartItem.quantity + quantity;
               if (totalQuantity > skuStock) {
                  throw new BadRequestException('Số lượng sản phẩm trong giỏ hàng vượt quá số lượng tồn kho');
               }
               cartItem.quantity = totalQuantity;
               await tx.save(cartItem);
               return cartItem;
            } else {
               // Nếu giỏ hàng chưa tồn tại, tạo mới
               const newCart = tx.create(Cart, { user_id: user.usr_id, product_id, quantity, sku_id, price });
               await tx.save(newCart);
               return newCart;
            }
         });
         return {
            message: 'Tạo giỏ hàng thành công',
            data: cart,
         };
      } catch (e) {
         this.logService.logger.default.error(e?.message ?? 'Tạo giỏ hàng thất bại', e);
         throw e;
      }
   }

   async findOne({ cart_id, user }: { cart_id: number; user: IUser }) {
      try {
         const cartItem = await this.cartRepo
            .createQueryBuilder('c')
            .where('c.cart_id = :cartId', { cartId: cart_id })
            .andWhere('c.user_id = :userId', { userId: user.usr_id })
            .leftJoinAndSelect('spu', 'p', 'c.product_id = p.spu_id')
            .leftJoinAndSelect('sku', 'sku', 'c.sku_id = sku.sku_id AND c.product_id = sku.product_id')
            .select([
               'c.*',
               'p.product_name AS product_name',
               'p.product_thumb AS product_thumb',
               'sku.sku_tier_idx AS product_attribute',
               'sku.sku_stock AS product_stock',
            ])
            .getRawOne();

         if (!cartItem) {
            throw new NotFoundException('Sản phẩm không tồn tại trong giỏ hàng');
         }

         return {
            message: 'Lấy chi tiết giỏ hàng thành công',
            data: cartItem,
         };
      } catch (e) {
         this.logService.logger.default.error(e?.message ?? 'Lấy chi tiết giỏ hàng thất bại', e);
         throw e;
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

            const skuItem = await tx.findOne(Sku, {
               where: { sku_id: cartItem.sku_id, product_id: cartItem.product_id, is_deleted: false },
            });

            if (!skuItem) {
               throw new NotFoundException('Thuộc tính sản phẩm không tồn tại');
            }

            if (action === QuantityAction.INCREMENT) {
               if (cartItem.quantity + 1 > skuItem.sku_stock) {
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
         this.logService.logger.default.error(e?.message ?? 'Cập nhật số lượng thất bại', e);
         throw e;
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
         this.logService.logger.default.error(e?.message ?? 'Xóa sản phẩm khỏi giỏ hàng thất bại', e);
         throw e;
      }
   }
}
