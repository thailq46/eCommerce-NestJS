import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariantOptionValue } from 'src/modules/product-variant-option-value/entities/product-variant-option-value.entity';
import { ProductVariantOptionValueController } from './product-variant-option-value.controller';
import { ProductVariantOptionValueService } from './product-variant-option-value.service';

@Module({
   imports: [TypeOrmModule.forFeature([ProductVariantOptionValue])],
   controllers: [ProductVariantOptionValueController],
   providers: [ProductVariantOptionValueService],
})
export class ProductVariantOptionValueModule {}
