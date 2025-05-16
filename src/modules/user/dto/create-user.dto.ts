import {Transform} from 'class-transformer';
import {
   IsEmail,
   IsEnum,
   IsNotEmpty,
   IsNumber,
   IsNumberString,
   IsOptional,
   IsString,
   MaxLength,
   MinLength,
} from 'class-validator';
import {IsNotSpecialCharacter} from 'src/base/decorators/validator.decorator';
import {EUserGender, EUserStatus} from 'src/base/shared/enum/common.enum';

export class CreateUserDto {
   @IsNotEmpty({message: 'Email không để trống!'})
   @Transform(({value}) => value && value.trim())
   @MinLength(6, {message: 'Email không ít hơn 6 kí tự'})
   @MaxLength(257, {message: 'Email không quá 257 kí tự'})
   @IsEmail({}, {message: 'Email không đúng dạng'})
   email: string;

   @IsNotEmpty({message: 'Password không để trống!'})
   @MinLength(5, {message: 'Password không ít hơn 5 kí tự'})
   @MaxLength(30, {message: 'Password không nhiều hơn 30 kí tự'})
   password: string;

   @IsOptional()
   @IsString({message: 'username phải là chuỗi'})
   @Transform(({value}) => value && value.trim())
   username?: string;

   @IsOptional()
   @IsEnum(EUserGender, {message: 'Giới tính không hợp lệ'})
   gender?: EUserGender;

   @IsOptional()
   @Transform(({value}) => value && value.trim())
   @MaxLength(30, {message: 'fullName không quá 30 kí tự'})
   @IsNotSpecialCharacter({message: 'fullName: Không chứa ký tự đặc biệt'})
   fullname?: string;

   @IsOptional()
   @IsNumberString()
   @MinLength(10, {message: 'phoneNumber không ít hơn 10 số'})
   @MaxLength(11, {message: 'phoneNumber không quá 11 số'})
   phone?: string;

   @IsOptional()
   @IsString({message: 'avatar phải là chuỗi'})
   avatar?: string;

   @IsOptional()
   date_of_birth?: string;

   @IsOptional()
   status?: EUserStatus;

   @IsOptional()
   @IsNumber({}, {message: 'usr_last_login_at phải là số'})
   usr_last_login_at?: number;

   @IsOptional()
   @IsString({message: 'usr_last_login_ip_at phải là chuỗi'})
   @MaxLength(12, {message: 'usr_last_login_ip_at không quá 15 kí tự'})
   @IsNotSpecialCharacter({message: 'usr_last_login_ip_at: Không chứa ký tự đặc biệt'})
   usr_last_login_ip_at?: string;

   @IsOptional()
   @IsNumber({}, {message: 'usr_login_times phải là số'})
   usr_login_times?: number;
}
