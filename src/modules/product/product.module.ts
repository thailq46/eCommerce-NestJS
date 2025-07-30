import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/base/db/redis/redis.module';
import { Product } from 'src/modules/product/entities/product.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
   imports: [TypeOrmModule.forFeature([Product]), RedisModule],
   controllers: [ProductController],
   providers: [ProductService],
})
export class ProductModule {}
