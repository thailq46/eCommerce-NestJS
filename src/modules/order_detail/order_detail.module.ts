import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderDetail } from 'src/modules/order_detail/entities/order_detail.entity';
import { OrderDetailController } from './order_detail.controller';
import { OrderDetailService } from './order_detail.service';

@Module({
   imports: [TypeOrmModule.forFeature([OrderDetail])],
   controllers: [OrderDetailController],
   providers: [OrderDetailService],
})
export class OrderDetailModule {}
