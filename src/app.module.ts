import {Module} from '@nestjs/common';
import {ConfigModule} from 'src/base/config';
import {DatabaseModule} from 'src/base/db/db.module';
import {RedisModule} from 'src/base/db/redis/redis.module';
import {LoggingModule} from 'src/base/logging/logging.module';

import {APP_GUARD} from '@nestjs/core';
import {JwtAuthGuard} from 'src/modules/auth/jwt-auth.guard';
import {RefreshTokensModule} from 'src/modules/refresh-tokens/refresh-tokens.module';
import {AuthModule} from './modules/auth/auth.module';
import {UserModule} from './modules/user/user.module';

const globalModule = [ConfigModule, LoggingModule];

const coreModule = [DatabaseModule, RedisModule];

const appModule = [UserModule, AuthModule, RefreshTokensModule];

@Module({
   imports: [...globalModule, ...coreModule, ...appModule],
   providers: [
      {
         provide: APP_GUARD,
         useClass: JwtAuthGuard,
      },
   ],
})
export class AppModule {}
