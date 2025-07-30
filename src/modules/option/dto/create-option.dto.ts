import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateOptionDto {
   @IsNotEmpty({ message: 'Name không được để trống' })
   @IsString({ message: 'Name phải là một chuỗi' })
   @MaxLength(255, { message: 'Name không được vượt quá 255 ký tự' })
   name: string;
}
