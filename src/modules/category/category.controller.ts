import {Body, Controller, Delete, Get, Param, Patch, Post, Query} from '@nestjs/common';
import {ParamIdDto} from 'src/base/shared/dto/common.dto';
import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
import {CategoryService} from './category.service';
import {CreateCategoryDto} from './dto/create-category.dto';
import {UpdateCategoryDto} from './dto/update-category.dto';

@Controller('category')
export class CategoryController {
   constructor(private readonly categoryService: CategoryService) {}

   @Post()
   create(@Body() createCategoryDto: CreateCategoryDto) {
      return this.categoryService.create(createCategoryDto);
   }

   @Get()
   findAll(@Query() query: QuerySpecificationDto) {
      return this.categoryService.findAll(query);
   }

   @Get(':id')
   findOne(@Param() {id}: ParamIdDto) {
      return this.categoryService.findOne(id);
   }

   @Patch(':id')
   update(@Param() {id}: ParamIdDto, @Body() updateCategoryDto: UpdateCategoryDto) {
      return this.categoryService.update(id, updateCategoryDto);
   }

   @Delete(':id')
   remove(@Param() {id}: ParamIdDto) {
      return this.categoryService.remove(id);
   }
}
