import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from 'src/modules/product-variant/entities/product-variant.entity';
import { ProductVariantController } from './product-variant.controller';
import { ProductVariantService } from './product-variant.service';

@Module({
   imports: [TypeOrmModule.forFeature([ProductVariant])],
   controllers: [ProductVariantController],
   providers: [ProductVariantService],
})
export class ProductVariantModule {}
