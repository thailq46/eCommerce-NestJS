import {Transform} from 'class-transformer';
import {IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf} from 'class-validator';

export class CreateCategoryDto {
   @IsNotEmpty({message: 'Tên danh mục không được để trống'})
   @IsString({message: 'Tên danh mục phải là chuỗi'})
   @MinLength(2, {message: 'Tên danh mục phải có ít nhất 2 ký tự'})
   @MaxLength(255, {message: 'Tên danh mục không được vượt quá 255 ký tự'})
   cate_name: string;

   @IsNotEmpty({message: 'Mô tả danh mục không được để trống'})
   @IsString({message: 'Mô tả danh mục phải là chuỗi'})
   @MinLength(5, {message: 'Mô tả danh mục phải có ít nhất 5 ký tự'})
   @MaxLength(500, {message: 'Mô tả danh mục không được vượt quá 500 ký tự'})
   cate_desc: string;

   @IsNotEmpty({message: 'Slug danh mục không được để trống'})
   @IsString({message: 'Slug danh mục phải là chuỗi'})
   @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug chỉ được chứa các ký tự chữ thường, số và dấu gạch ngang',
   })
   @MaxLength(255, {message: 'Slug danh mục không được vượt quá 255 ký tự'})
   cate_slug: string;

   @IsOptional()
   @ValidateIf((o) => o.parent_id !== null && o.parent_id !== undefined)
   @IsInt({message: 'ID danh mục cha phải là số nguyên'})
   @Transform(({value}) => (!value ? null : Number(value)))
   parent_id?: number | null;
}
