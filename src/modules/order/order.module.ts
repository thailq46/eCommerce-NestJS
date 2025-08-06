import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/base/db/redis/redis.module';
import { Order } from 'src/modules/order/entities/order.entity';
import { ProductModule } from 'src/modules/product/product.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
   imports: [TypeOrmModule.forFeature([Order]), RedisModule, ProductModule],
   controllers: [OrderController],
   providers: [OrderService],
   exports: [OrderService],
})
export class OrderModule {}
