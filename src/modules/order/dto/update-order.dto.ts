import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from 'src/modules/order/types';
import { CreateOrderDto } from './create-order.dto';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
   @IsNotEmpty({ message: 'Trạng thái không được để trống' })
   @IsEnum(OrderStatus, { message: 'Trạng thái không hợp lệ' })
   status: OrderStatus;

   @IsOptional()
   @IsString({ message: 'Ghi chú phải là chuỗi' })
   note?: string;
}
