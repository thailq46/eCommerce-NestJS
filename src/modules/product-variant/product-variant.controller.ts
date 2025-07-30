import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantService } from './product-variant.service';

@Controller('product-variant')
export class ProductVariantController {
   constructor(private readonly productVariantService: ProductVariantService) {}

   @Post()
   create(@Body() createProductVariantDto: CreateProductVariantDto) {
      return this.productVariantService.create(createProductVariantDto);
   }

   @Get()
   findAll() {
      return this.productVariantService.findAll();
   }

   @Get(':id')
   findOne(@Param('id') id: string) {
      return this.productVariantService.findOne(+id);
   }

   @Patch(':id')
   update(@Param('id') id: string, @Body() updateProductVariantDto: UpdateProductVariantDto) {
      return this.productVariantService.update(+id, updateProductVariantDto);
   }

   @Delete(':id')
   remove(@Param('id') id: string) {
      return this.productVariantService.remove(+id);
   }
}
