import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { QuantityAction } from 'src/modules/cart/types';

export class CreateCartDto {
   @IsNotEmpty({ message: 'Product ID không được để trống' })
   @IsNumber(undefined, { message: 'Product ID phải là một số' })
   product_id: number;

   @IsNotEmpty({ message: 'Quantity không được để trống' })
   @IsNumber(undefined, { message: 'Quantity phải là một số' })
   quantity: number;

   @IsNotEmpty({ message: 'Price không được để trống' })
   @IsNumber(undefined, { message: 'Price phải là một số' })
   price: number;

   @IsNotEmpty({ message: 'Product Variant Id không được để trống' })
   @IsNumber(undefined, { message: 'Product Variant Id phải là một số' })
   product_variant_id: number;
}

export class UpdateCartQuantityDto {
   @IsNotEmpty({ message: 'Action không được để trống' })
   @IsEnum(QuantityAction, { message: 'Action không hợp lệ' })
   action: QuantityAction;
}
