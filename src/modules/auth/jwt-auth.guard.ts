import {ExecutionContext, Injectable, UnauthorizedException} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {JwtService} from '@nestjs/jwt';
import {AuthGuard} from '@nestjs/passport';
import {Request} from 'express';
import {lastValueFrom, Observable} from 'rxjs';
import {RedisService} from 'src/base/db/redis/redis.service';
import {IS_PUBLIC_KEY} from 'src/base/decorators/customize.decorator';
import {TokenPayload} from 'src/modules/auth/types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
   constructor(
      private reflector: Reflector,
      private jwtService: JwtService,
      private redisService: RedisService,
   ) {
      super();
   }

   async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
         context.getHandler(),
         context.getClass(),
      ]);

      if (isPublic) {
         return true;
      }

      const request = context.switchToHttp().getRequest();
      const {url} = request;

      if (url === '/metrics') {
         return true;
      }

      const token = this.extractTokenFromHeader(request);
      if (!token) {
         throw new UnauthorizedException('Token không hợp lệ');
      }
      const decoded: TokenPayload = this.jwtService.decode(token);

      // Kiểm tra token có trong black_list trong Redis
      const isTokenExistsBlackList = await this.redisService.get(`TOKEN_BLACK_LIST_${decoded.user_id}_${decoded.jit}`);
      if (isTokenExistsBlackList) {
         throw new UnauthorizedException('Token revoked');
      }

      // Check iat token
      const changePasswordTimestamp = await this.redisService.get(`TOKEN_IAT_AVAILABLE_${decoded.user_id}`);
      if (changePasswordTimestamp && decoded.iat < parseInt(changePasswordTimestamp)) {
         throw new UnauthorizedException('Token revoked: -> Token invalidated due to password change');
      }

      const result = super.canActivate(context);
      // Nếu result là Observable, chuyển đổi về Promise và await để lấy boolean
      return result instanceof Observable ? await lastValueFrom(result) : result;
   }

   private extractTokenFromHeader(request: Request): string | undefined {
      const [type, token] = request.headers.authorization?.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
   }
}
