import {Body, Controller, Delete, Get, Param, Patch, Post, Query, Req} from '@nestjs/common';
import {ParamIdDto} from 'src/base/shared/dto/common.dto';
import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
import {CreateShopDto} from './dto/create-shop.dto';
import {UpdateShopDto} from './dto/update-shop.dto';
import {ShopService} from './shop.service';

@Controller('shop')
export class ShopController {
   constructor(private readonly shopService: ShopService) {}

   @Post()
   create(@Body() createShopDto: CreateShopDto, @Req() req) {
      return this.shopService.create({data: createShopDto, user: req.user});
   }

   @Patch(':id')
   update(@Param() {id}: ParamIdDto, @Body() updateShopDto: UpdateShopDto) {
      return this.shopService.update(id, updateShopDto);
   }

   @Delete(':id')
   remove(@Param() {id}: ParamIdDto) {
      return this.shopService.remove(id);
   }

   @Get()
   findAll(@Query() query: QuerySpecificationDto) {
      return this.shopService.findAll(query);
   }

   @Get(':id')
   findOne(@Param() {id}: ParamIdDto) {
      return this.shopService.findOne(id);
   }
}
