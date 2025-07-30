import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class VariantOptionDto {
   @IsNotEmpty()
   @IsString()
   optionName: string; // e.g., "Color"

   @IsNotEmpty()
   @IsString()
   optionValue: string; // e.g., "Blue"
}

class VariantDto {
   @IsNotEmpty()
   @IsString()
   sku: string;

   @IsNotEmpty()
   @IsNumber()
   price: number;

   @IsNumber()
   stockQuantity: number;

   @IsArray()
   @ValidateNested({ each: true })
   @Type(() => VariantOptionDto)
   options: VariantOptionDto[];
}

export class CreateProductDto {
   @IsNotEmpty()
   @IsString()
   name: string; // Tên SPU

   @IsNotEmpty()
   @IsString()
   description: string;

   @IsNotEmpty()
   @IsNumber()
   category_id: number;

   @IsOptional()
   @IsNumber()
   rating_avg?: number;

   @IsOptional()
   @IsString()
   thumbnail?: string;

   @IsArray()
   @ValidateNested({ each: true })
   @Type(() => VariantDto)
   variants: VariantDto[];
}
