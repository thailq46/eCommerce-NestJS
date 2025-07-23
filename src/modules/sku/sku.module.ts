import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {RedisModule} from 'src/base/db/redis/redis.module';
import {Sku} from 'src/modules/sku/entities/sku.entity';
import {SkuController} from './sku.controller';
import {SkuService} from './sku.service';

@Module({
   imports: [TypeOrmModule.forFeature([Sku]), RedisModule],
   controllers: [SkuController],
   providers: [SkuService],
   exports: [SkuService],
})
export class SkuModule {}
