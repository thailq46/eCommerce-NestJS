import {IsNotEmpty, IsNumber, IsString} from 'class-validator';

export class CreateRefreshTokenDto {
  @IsNotEmpty({message: 'user_id không được để trống'})
  @IsNumber({}, {message: 'user_id phải là số'})
  user_id: number;

  @IsNotEmpty({message: 'token không được để trống'})
  @IsString({message: 'token phải là chuỗi'})
  token: string;

  @IsNotEmpty({message: 'iat không được để trống'})
  @IsNumber({}, {message: 'iat phải là số'})
  iat: number;

  @IsNotEmpty({message: 'exp không được để trống'})
  @IsNumber({}, {message: 'exp phải là số'})
  exp: number;
}
