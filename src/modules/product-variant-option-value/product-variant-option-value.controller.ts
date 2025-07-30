import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateProductVariantOptionValueDto } from './dto/create-product-variant-option-value.dto';
import { UpdateProductVariantOptionValueDto } from './dto/update-product-variant-option-value.dto';
import { ProductVariantOptionValueService } from './product-variant-option-value.service';

@Controller('product-variant-option-value')
export class ProductVariantOptionValueController {
   constructor(private readonly productVariantOptionValueService: ProductVariantOptionValueService) {}

   @Post()
   create(@Body() createProductVariantOptionValueDto: CreateProductVariantOptionValueDto) {
      return this.productVariantOptionValueService.create(createProductVariantOptionValueDto);
   }

   @Get()
   findAll() {
      return this.productVariantOptionValueService.findAll();
   }

   @Get(':id')
   findOne(@Param('id') id: string) {
      return this.productVariantOptionValueService.findOne(+id);
   }

   @Patch(':id')
   update(@Param('id') id: string, @Body() updateProductVariantOptionValueDto: UpdateProductVariantOptionValueDto) {
      return this.productVariantOptionValueService.update(+id, updateProductVariantOptionValueDto);
   }

   @Delete(':id')
   remove(@Param('id') id: string) {
      return this.productVariantOptionValueService.remove(+id);
   }
}
