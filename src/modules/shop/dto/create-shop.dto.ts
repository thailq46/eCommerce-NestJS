import {IsNotEmpty, IsOptional, IsString, MaxLength} from 'class-validator';

export class CreateShopDto {
   @IsNotEmpty({message: 'Tên cửa hàng không được để trống'})
   @MaxLength(150, {message: 'Tên cửa hàng không được quá 150 ký tự'})
   @IsString({message: 'Tên cửa hàng phải là chuỗi'})
   shop_name: string;

   @IsNotEmpty({message: 'Mô tả cửa hàng không được để trống'})
   @MaxLength(500, {message: 'Mô tả cửa hàng không được quá 500 ký tự'})
   @IsString({message: 'Mô tả cửa hàng phải là chuỗi'})
   shop_desc: string;

   @IsNotEmpty({message: 'Địa chỉ cửa hàng không được để trống'})
   @MaxLength(500, {message: 'Địa chỉ cửa hàng không được quá 500 ký tự'})
   @IsString({message: 'Địa chỉ cửa hàng phải là chuỗi'})
   shop_address: string;

   @IsOptional()
   @IsString({message: 'Avatar phải là chuỗi'})
   shop_avatar?: string | null;

   @IsOptional()
   @IsString({message: 'Banner phải là chuỗi'})
   shop_banner?: string | null;
}
