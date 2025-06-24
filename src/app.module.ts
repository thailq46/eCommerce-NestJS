import {Module} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {JwtAuthGuard} from 'src/modules/auth/jwt-auth.guard';

import {PrometheusModule} from '@willsoto/nestjs-prometheus';
import {ConfigModule} from 'src/base/config';
import {DatabaseModule} from 'src/base/db/db.module';
import {RedisModule} from 'src/base/db/redis/redis.module';
import {LoggingModule} from 'src/base/logging/logging.module';
import {RefreshTokensModule} from 'src/modules/refresh-tokens/refresh-tokens.module';
import {UploadModule} from 'src/modules/upload/upload.module';
import {AuthModule} from './modules/auth/auth.module';
import {CategoryModule} from './modules/category/category.module';
import {HttpExternalModule} from './modules/http-external/http-external.module';
import {ShopModule} from './modules/shop/shop.module';
import {SkuModule} from './modules/sku/sku.module';
import {SpuModule} from './modules/spu/spu.module';
import {UserModule} from './modules/user/user.module';

const globalModule = [ConfigModule, LoggingModule];

const coreModule = [DatabaseModule, RedisModule];

const appModule = [
   UserModule,
   AuthModule,
   RefreshTokensModule,
   ShopModule,
   SpuModule,
   CategoryModule,
   SkuModule,
   UploadModule,
   HttpExternalModule,
];

@Module({
   imports: [...globalModule, ...coreModule, ...appModule, PrometheusModule.register({path: '/metrics'})],
   providers: [
      {
         provide: APP_GUARD,
         useClass: JwtAuthGuard,
      },
   ],
})
export class AppModule {}
