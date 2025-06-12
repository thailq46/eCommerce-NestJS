import {Type} from 'class-transformer';
import {
   ArrayMinSize,
   IsArray,
   IsBoolean,
   IsNotEmpty,
   IsNumber,
   IsOptional,
   IsString,
   Max,
   MaxLength,
   Min,
   MinLength,
   ValidateNested,
} from 'class-validator';

class VariationOption {
   @IsOptional()
   @IsArray({message: 'Hình ảnh thuộc tính không hợp lệ'})
   images: string[];

   @IsString({message: 'Tên thuộc tính không hợp lệ'})
   @IsNotEmpty({message: 'Tên thuộc tính không được để trống'})
   @MinLength(1)
   @MaxLength(50)
   name: string;

   @IsArray({message: 'Giá trị thuộc tính không hợp lệ'})
   @ArrayMinSize(1)
   @IsString({each: true, message: 'Giá trị thuộc tính không hợp lệ'})
   options: string[];
}

class SkuItem {
   @IsArray({message: 'Danh sách thuộc tính không hợp lệ'})
   @ArrayMinSize(1)
   @IsNumber(undefined, {each: true, message: 'Danh sách thuộc tính phải là số'})
   sku_tier_idx: number[];

   @IsNumber(undefined, {message: 'Giá không hợp lệ'})
   @Min(0, {message: 'Giá không hợp lệ'})
   sku_price: number;

   @IsNumber(undefined, {message: 'Số lượng tồn không hợp lệ'})
   @Min(0, {message: 'Số lượng tồn không hợp lệ'})
   sku_stock: number;

   @IsBoolean({message: 'Trạng thái mặc định không hợp lệ'})
   sku_default: boolean;
}

export class CreateSpuDto {
   @IsNotEmpty({message: 'Tên sản phẩm không được để trống'})
   @IsString({message: 'Tên sản phẩm không hợp lệ'})
   @MinLength(3, {message: 'Tên sản phẩm phải có ít nhất 3 ký tự'})
   @MaxLength(255, {message: 'Tên sản phẩm không được vượt quá 255 ký tự'})
   product_name: string;

   @IsNotEmpty({message: 'Mô tả sản phẩm không được để trống'})
   @IsString({message: 'Mô tả sản phẩm không hợp lệ'})
   @MinLength(10, {message: 'Mô tả sản phẩm phải có ít nhất 10 ký tự'})
   @MaxLength(500, {message: 'Mô tả sản phẩm không được vượt quá 500 ký tự'})
   product_desc: string;

   @IsNotEmpty({message: 'Danh mục sản phẩm không được để trống'})
   @IsNumber(undefined, {message: 'Danh mục sản phẩm không hợp lệ'})
   product_category: number;

   @IsArray({message: 'Danh sách thuộc tính không hợp lệ'})
   @ValidateNested({each: true})
   @ArrayMinSize(1, {message: 'Danh sách thuộc tính yêu cầu tối thiểu 1 thuộc tính'})
   @Type(() => VariationOption)
   product_variations: VariationOption[];

   @IsArray({message: 'Danh sách thuộc tính sku không hợp lệ'})
   @ValidateNested({each: true})
   @ArrayMinSize(1, {message: 'Danh sách thuộc tính sku yêu cầu tối thiểu 1 thuộc tính'})
   @Type(() => SkuItem)
   sku_list: SkuItem[];

   @IsOptional()
   // @IsUrl({protocols: ['http', 'https'], require_protocol: true}, {message: 'URL ảnh không hợp lệ'})
   product_thumb?: string | null;

   @IsOptional()
   @IsNumber(undefined, {message: 'Rating không hợp lệ'})
   @Min(0, {message: 'Rating không hợp lệ'})
   @Max(5, {message: 'Rating không hợp lệ'})
   product_rating_avg?: number;
}
