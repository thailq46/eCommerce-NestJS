import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';

import { CacheModule } from '@nestjs/cache-manager';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ConfigModule } from 'src/base/config';
import { DatabaseModule } from 'src/base/db/db.module';
import { KafkaModule } from 'src/base/db/kafka/kafka.module';
import { RedisModule } from 'src/base/db/redis/redis.module';
import { LoggingModule } from 'src/base/logging/logging.module';
import { PrometheusMiddleware } from 'src/base/middleware/prometheus.middleware';
import { RefreshTokensModule } from 'src/modules/refresh-tokens/refresh-tokens.module';
import { UploadModule } from 'src/modules/upload/upload.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoryModule } from './modules/category/category.module';
import { HttpExternalModule } from './modules/http-external/http-external.module';
import { OptionValueModule } from './modules/option-value/option-value.module';
import { OptionModule } from './modules/option/option.module';
import { OrderModule } from './modules/order/order.module';
import { OrderDetailModule } from './modules/order_detail/order_detail.module';
import { ProductVariantOptionValueModule } from './modules/product-variant-option-value/product-variant-option-value.module';
import { ProductVariantModule } from './modules/product-variant/product-variant.module';
import { ProductModule } from './modules/product/product.module';
import { ShopModule } from './modules/shop/shop.module';
import { SkuModule } from './modules/sku/sku.module';
import { SpuModule } from './modules/spu/spu.module';
import { UserModule } from './modules/user/user.module';

const globalModule = [ConfigModule, LoggingModule];

const coreModule = [DatabaseModule, RedisModule, KafkaModule];

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
   CartModule,
   OrderModule,
   OrderDetailModule,
   OptionModule,
   OptionValueModule,
   ProductModule,
   ProductVariantModule,
   ProductVariantOptionValueModule,
];

@Module({
   imports: [
      ...globalModule,
      ...coreModule,
      ...appModule,
      PrometheusModule.register({ path: '/metrics' }),
      CacheModule.register({ isGlobal: true }),
   ],
   providers: [
      {
         provide: APP_GUARD,
         useClass: JwtAuthGuard,
      },
   ],
})
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
      consumer.apply(PrometheusMiddleware).forRoutes('*');
   }
}
