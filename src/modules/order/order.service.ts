import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { RedisService } from 'src/base/db/redis/redis.service';
import { LoggingService } from 'src/base/logging';
import { QuerySpecificationDto } from 'src/base/shared/dto/query-specification.dto';
import { Order } from 'src/modules/order/entities/order.entity';
import { OrderDetail } from 'src/modules/order_detail/entities/order_detail.entity';
import { ProductVariant } from 'src/modules/product-variant/entities/product-variant.entity';
import { ProductService } from 'src/modules/product/product.service';
import { IUser } from 'src/modules/user/types';
import { DataSource, Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
   constructor(
      @InjectRepository(Order)
      private readonly orderRepo: Repository<Order>,
      private readonly dataSource: DataSource,
      private readonly loggingService: LoggingService,
      private readonly redisService: RedisService,
      private readonly productService: ProductService,
      @Inject(CACHE_MANAGER)
      private readonly cacheManager: Cache,
   ) {}

   async createOrder({ payload, user }: { payload: CreateOrderDto; user: IUser }) {
      try {
         const result = await this.dataSource.transaction(async (tx) => {
            // 1. Kiểm tra tồn tại và số lượng của các SKU
            const skusToUpdate: { product_variant_id: number; product_id: number; quantity: number }[] = [];
            for (const item of payload.items) {
               const sku = await tx.findOne(ProductVariant, {
                  where: { id: item.product_variant_id, product_id: item.product_id, is_deleted: false },
               });
               if (!sku) {
                  throw new NotFoundException(
                     `Không tìm thấy SKU với ID ${item.product_variant_id} và Product ID ${item.product_id}`,
                  );
               }
               if (sku.stock_quantity < item.quantity) {
                  throw new NotFoundException(
                     `Số lượng SKU với ID ${item.product_variant_id} không đủ, chỉ còn ${sku.stock_quantity}`,
                  );
               }
               skusToUpdate.push({
                  product_variant_id: item.product_variant_id,
                  product_id: item.product_id,
                  quantity: item.quantity,
               });
            }
            // 2. Tính tổng tiền và tạo đơn hàng
            const items = payload.items;
            let sub_total = 0;
            // Tính tổng tiền sản phẩm
            items.forEach((item) => {
               sub_total += item.price * item.quantity;
            });
            // Tạo đơn hàng
            const order = tx.create(Order, {
               user_id: user.usr_id,
               fullname: payload.fullname,
               phone_number: payload.phone_number,
               email: payload.email,
               shipping_address: payload.shipping_address,
               note: payload.note,
               total_amount: sub_total,
            });
            const savedOrder = await tx.save(order);
            // 3. Tạo chi tiết đơn hàng
            const orderDetails = items.map((item) => {
               return tx.create(OrderDetail, {
                  order_id: savedOrder.order_id,
                  product_id: item.product_id,
                  product_variant_id: item.product_variant_id,
                  quantity: item.quantity,
                  price: item.price,
                  sub_total: item.price * item.quantity,
               });
            });
            const savedOrderDetails = await tx.save(orderDetails);
            // 4. Cập nhật số lượng SKU
            for (const item of skusToUpdate) {
               await tx.update(
                  ProductVariant,
                  { id: item.product_variant_id, product_id: item.product_id },
                  { stock_quantity: () => `stock_quantity - ${item.quantity}` },
               );
            }
            // 5. Xóa cache liên quan đến sản phẩm
            for (const item of items) {
               const KEY_CACHE = `PRO_ITEM:${item.product_id}`;
               await Promise.all([this.redisService.del(KEY_CACHE), this.cacheManager.del(KEY_CACHE)]);
               await this.redisService.publish('product_update', JSON.stringify({ product_id: item.product_id }));
            }
            return {
               order: savedOrder,
               order_details: savedOrderDetails,
            };
         });
         this.loggingService.getLogger(OrderService.name).info('OrderService ~ createOrder ~ result', result);
         return {
            message: 'Tạo đơn hàng thành công',
            data: result,
         };
      } catch (error) {
         this.loggingService.getLogger(OrderService.name).error('OrderService ~ createOrder ~ error', error);
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Đã xảy ra lỗi khi tạo đơn hàng');
      }
   }

   async updateOrderStatus({ order_id, payload }: { order_id: number; payload: UpdateOrderDto }) {
      try {
         const order = await this.orderRepo.findOne({
            where: { order_id, is_deleted: false },
         });
         if (!order) {
            throw new NotFoundException(`Không tìm thấy đơn hàng với ID ${order_id}`);
         }
         // Cập nhật trạng thái đơn hàng
         await this.orderRepo.update(order_id, {
            ...payload,
            updated_at: new Date(),
         });
         const updatedOrder = await this.orderRepo.findOne({
            where: { order_id },
            relations: ['order_details'],
         });
         return {
            message: 'Cập nhật đơn hàng thành công',
            data: updatedOrder,
         };
      } catch (error) {
         this.loggingService.getLogger(OrderService.name).error('OrderService ~ updateOrderStatus ~ error', error);
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng');
      }
   }

   async removeOrder({ order_id }: { order_id: number }) {
      try {
         const order = await this.orderRepo.findOne({
            where: { order_id, is_deleted: false },
         });
         if (!order) {
            throw new NotFoundException(`Không tìm thấy đơn hàng có id ${order_id}`);
         }
         await this.orderRepo.update(order_id, { is_deleted: true, deleted_at: new Date() });
         return {
            message: 'Xóa đơn hàng thành công',
            data: { order_id },
         };
      } catch (error) {
         this.loggingService.getLogger(OrderService.name).error('OrderService ~ remove ~ error', error);
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Đã xảy ra lỗi khi xóa đơn hàng');
      }
   }

   async findOne({ order_id }: { order_id: number }) {
      try {
         const order = await this.orderRepo.findOne({
            where: { order_id, is_deleted: false },
            relations: ['order_details'],
         });
         if (!order) {
            throw new NotFoundException(`Không tìm thấy đơn hàng có id ${order_id}`);
         }
         return {
            message: 'Lấy thông tin đơn hàng thành công',
            data: order,
         };
      } catch (error) {
         this.loggingService.getLogger(OrderService.name).error('OrderService ~ findOne ~ error', error);
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Đã xảy ra lỗi khi lấy thông tin đơn hàng');
      }
   }

   async findAll({ query }: { query: QuerySpecificationDto }) {
      try {
         const { page = 1, limit = 10 } = query;
         const skip = (page - 1) * limit;

         const queryBuilder = this.orderRepo
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.order_details', 'order_details')
            .where('order.is_deleted = :isDeleted', { isDeleted: false });

         queryBuilder.skip(skip).take(limit);

         const [total, orders] = await Promise.all([queryBuilder.getCount(), queryBuilder.getMany()]);

         const totalPages = Math.ceil(total / limit);
         const hasNextPage = page < totalPages;
         const hasPrevPage = page > 1;

         return {
            message: 'Lấy danh sách đơn hàng thành công',
            data: {
               data: orders,
               meta: {
                  total,
                  page: +page,
                  limit: +limit,
                  totalPages,
                  hasNextPage,
                  hasPrevPage,
               },
            },
         };
      } catch (error) {
         this.loggingService.getLogger(OrderService.name).error('OrderService ~ findAll ~ error', error);
         throw new BadRequestException('Đã xảy ra lỗi khi lấy danh sách đơn hàng');
      }
   }
}
