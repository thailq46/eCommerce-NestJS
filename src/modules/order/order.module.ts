import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/base/db/redis/redis.module';
import { Order } from 'src/modules/order/entities/order.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
   imports: [TypeOrmModule.forFeature([Order]), RedisModule],
   controllers: [OrderController],
   providers: [OrderService],
   exports: [OrderService],
})
export class OrderModule {}
