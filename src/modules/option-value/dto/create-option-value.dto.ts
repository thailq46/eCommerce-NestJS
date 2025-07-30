import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateOptionValueDto {
   @IsNotEmpty({ message: 'Option ID không được để trống' })
   @IsNumber({}, { message: 'Option ID phải là một số' })
   option_id: number;

   @IsNotEmpty({ message: 'Value không được để trống' })
   @IsString({ message: 'Value phải là một chuỗi' })
   @MaxLength(255, { message: 'Value không được vượt quá 255 ký tự' })
   value: string;
}
