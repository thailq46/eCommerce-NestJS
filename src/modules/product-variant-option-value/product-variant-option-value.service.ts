import { Injectable } from '@nestjs/common';
import { CreateProductVariantOptionValueDto } from './dto/create-product-variant-option-value.dto';
import { UpdateProductVariantOptionValueDto } from './dto/update-product-variant-option-value.dto';

@Injectable()
export class ProductVariantOptionValueService {
   create(createProductVariantOptionValueDto: CreateProductVariantOptionValueDto) {
      return 'This action adds a new productVariantOptionValue';
   }

   findAll() {
      return `This action returns all productVariantOptionValue`;
   }

   findOne(id: number) {
      return `This action returns a #${id} productVariantOptionValue`;
   }

   update(id: number, updateProductVariantOptionValueDto: UpdateProductVariantOptionValueDto) {
      return `This action updates a #${id} productVariantOptionValue`;
   }

   remove(id: number) {
      return `This action removes a #${id} productVariantOptionValue`;
   }
}
