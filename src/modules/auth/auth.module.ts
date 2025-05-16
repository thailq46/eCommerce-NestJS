import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {PassportModule} from '@nestjs/passport';
import {ConfigService} from 'src/base/config';
import {RedisModule} from 'src/base/db/redis/redis.module';
import {JwtStrategy} from 'src/modules/auth/passport/jwt.strategy';
import {LocalStrategy} from 'src/modules/auth/passport/local.strategy';
import {RefreshTokensModule} from 'src/modules/refresh-tokens/refresh-tokens.module';
import {UserRepository} from 'src/modules/user/repositories';
import {UserModule} from 'src/modules/user/user.module';
import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';

@Module({
   imports: [
      UserModule,
      PassportModule,
      JwtModule.registerAsync({
         inject: [ConfigService],
         useFactory: async (config: ConfigService) => ({
            secret: config.ACCESS_SECRET,
            signOptions: {expiresIn: config.ACCESS_TOKEN_EXP},
         }),
      }),
      RefreshTokensModule,
      RedisModule,
   ],
   providers: [AuthService, UserRepository, LocalStrategy, JwtStrategy],
   controllers: [AuthController],
   exports: [AuthService, JwtModule],
})
export class AuthModule {}
