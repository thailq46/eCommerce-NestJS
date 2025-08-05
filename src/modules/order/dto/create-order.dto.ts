import { Type } from 'class-transformer';
import {
   ArrayMinSize,
   IsArray,
   IsEmail,
   IsNotEmpty,
   IsNumber,
   IsOptional,
   IsString,
   MaxLength,
   Min,
   ValidateNested,
} from 'class-validator';

export class OrderItemDto {
   @IsNotEmpty({ message: 'Product ID không được để trống' })
   @IsNumber({}, { message: 'Product ID phải là số' })
   product_id: number;

   @IsNotEmpty({ message: 'Product Variant Id không được để trống' })
   @IsNumber(undefined, { message: 'Product Variant Id phải là một số' })
   product_variant_id: number;

   @IsNotEmpty({ message: 'Số lượng không được để trống' })
   @IsNumber({}, { message: 'Số lượng phải là số' })
   @Min(1, { message: 'Số lượng ít nhất phải là 1' })
   quantity: number;

   @IsNotEmpty({ message: 'Giá không được để trống' })
   @IsNumber({}, { message: 'Giá phải là số' })
   @Min(0, { message: 'Giá không được âm' })
   price: number;
}

export class CreateOrderDto {
   @IsNotEmpty({ message: 'fullname không được để trống' })
   @IsString({ message: 'fullname phải là chuỗi' })
   @MaxLength(100, { message: 'fullname không được quá 100 ký tự' })
   fullname: string;

   @IsNotEmpty({ message: 'phone_number không được để trống' })
   @IsString({ message: 'phone_number phải là chuỗi' })
   @MaxLength(20, { message: 'phone_number không được quá 20 ký tự' })
   phone_number: string;

   @IsNotEmpty({ message: 'email không được để trống' })
   @IsString({ message: 'email phải là chuỗi' })
   @IsEmail(undefined, { message: 'email không hợp lệ' })
   @MaxLength(100, { message: 'email không được quá 100 ký tự' })
   email: string;

   @IsNotEmpty({ message: 'shipping_address không được để trống' })
   @IsString({ message: 'shipping_address phải là chuỗi' })
   @MaxLength(200, { message: 'shipping_address không được quá 200 ký tự' })
   shipping_address: string;

   @IsOptional()
   @IsString({ message: 'note phải là chuỗi' })
   note?: string;

   @IsArray({ message: 'Chi tiết đơn hàng phải là mảng' })
   @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
   @ValidateNested({ each: true })
   @Type(() => OrderItemDto)
   items: OrderItemDto[];
}
