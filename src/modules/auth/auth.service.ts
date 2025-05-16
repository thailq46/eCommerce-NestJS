/* eslint-disable @typescript-eslint/no-unused-vars */
import {BadRequestException, Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {InjectRepository} from '@nestjs/typeorm';
import {Request} from 'express';
import {ConfigService} from 'src/base/config';
import {RedisService} from 'src/base/db/redis/redis.service';
import {TokenPayload, TokenType} from 'src/modules/auth/types';
import {RefreshTokensService} from 'src/modules/refresh-tokens/refresh-tokens.service';
import {UserRepository} from 'src/modules/user/repositories';
import {IUser} from 'src/modules/user/types';
import {v4 as uuidv4} from 'uuid';

@Injectable()
export class AuthService {
   constructor(
      @InjectRepository(UserRepository)
      private readonly userRepository: UserRepository,
      private jwtService: JwtService,
      private configService: ConfigService,
      private refreshTokenService: RefreshTokensService,
      private redisService: RedisService,
   ) {}

   async validateUser(email: string, password: string): Promise<IUser | null> {
      const user = await this.userRepository.findByEmail(email);
      const hashPassword = this.userRepository.hashPassword(password);
      if (user && user.usr_password === hashPassword) {
         const {usr_password, ...result} = user;
         return {...result};
      }
      return null;
   }

   private signAccessToken(user: IUser) {
      const payload = {user_id: user.usr_id, email: user.usr_email, token_type: TokenType.AccessToken, jit: uuidv4()};
      return this.jwtService.sign(payload);
   }

   private signRefreshToken(user: IUser) {
      const payload = {user_id: user.usr_id, email: user.usr_email, token_type: TokenType.RefreshToken};
      const refreshToken = this.jwtService.sign(payload, {
         secret: this.configService.REFRESH_SECRET,
         expiresIn: this.configService.REFRESH_TOKEN_EXP,
      });
      return refreshToken;
   }

   private signAccessTokenAndRefreshToken(user: IUser) {
      return Promise.all([this.signAccessToken(user), this.signRefreshToken(user)]);
   }

   async login(user: IUser) {
      const [accessToken, refreshToken] = await this.signAccessTokenAndRefreshToken(user);
      const decodedRefreshToken: TokenPayload = this.jwtService.decode(refreshToken);
      const {exp, iat, user_id} = decodedRefreshToken;
      await this.refreshTokenService.create({user_id, token: refreshToken, exp, iat});
      return {
         data: {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
               id: user.usr_id,
               email: user.usr_email,
               username: user.usr_username,
               phone: user.usr_phone,
               avatar: user.usr_avatar,
               date_of_birth: user.usr_date_of_birth,
               status: user.status,
               gender: user.usr_gender,
            },
         },
      };
   }

   async logout(refreshToken: string, req: Request) {
      const accessToken = req?.headers?.authorization?.split(' ')[1];
      const foundToken = await this.refreshTokenService.findOne(refreshToken);
      if (!foundToken) {
         throw new BadRequestException('Token đã hết hạn hoặc không tồn tại');
      }
      const decoded: TokenPayload = await this.jwtService.decode(accessToken as string);
      const redis = await this.redisService.set({
         key: `TOKEN_BLACK_LIST_${(req.user as IUser).usr_id}_${decoded.jit}`,
         value: 1,
      });
      console.log(`REDIS SET STATUS BLACK_LIST[:::] `, redis);
      await this.refreshTokenService.remove(refreshToken);
      return null;
   }

   async changePassword(body: {oldPassword: string; newPassword: string}, req: Request) {
      const user = req.user as IUser;
      const {oldPassword, newPassword} = body;
      const hashOldPassword = this.userRepository.hashPassword(oldPassword);
      const currentPassword = await this.userRepository.findPasswordById(user.usr_id);
      if (currentPassword !== hashOldPassword) {
         throw new BadRequestException('Mật khẩu cũ không đúng');
      }
      // TODO: Update new password in the database
      const hashNewPassword = this.userRepository.hashPassword(newPassword);
      await this.userRepository.update(user.usr_id, {usr_password: hashNewPassword});

      // Save the password change timestamp in Redis
      const changedPasswordDate = Math.floor(Date.now() / 1000); // Timestamp in seconds
      const invalidationKey = `TOKEN_IAT_AVAILABLE_${user.usr_id}`;
      const redis = await this.redisService.set({key: invalidationKey, value: changedPasswordDate});
      console.log(`REDIS SET STATUS CHANGE_PASS[:::] `, redis);
      return null;
   }
}
