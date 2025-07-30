import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from 'src/base/decorators/customize.decorator';
import { ParamIdDto } from 'src/base/shared/dto/common.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';

@Controller('product')
export class ProductController {
   constructor(private readonly productService: ProductService) {}

   @Post()
   createProduct(@Body() dto: CreateProductDto, @Req() req: Request) {
      return this.productService.createProduct({ dto, user: req.user });
   }

   @Public()
   @Get(':id')
   findOne(@Param() { id }: ParamIdDto) {
      return this.productService.findOne(id);
   }
}
