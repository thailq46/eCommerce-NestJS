import {Type} from 'class-transformer';
import {IsNotEmpty, IsNumber} from 'class-validator';

export class QuerySkuDto {
   @IsNotEmpty({message: 'SKU ID không được để trống'})
   @IsNumber(undefined, {message: 'SKU ID phải là một số'})
   @Type(() => Number)
   sku_id: number;

   @IsNotEmpty({message: 'Product ID không được để trống'})
   @IsNumber(undefined, {message: 'Product ID phải là một số'})
   @Type(() => Number)
   product_id: number;
}
