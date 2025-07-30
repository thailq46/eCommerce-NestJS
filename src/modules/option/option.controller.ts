import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ParamIdDto } from 'src/base/shared/dto/common.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { OptionService } from './option.service';

@Controller('option')
export class OptionController {
   constructor(private readonly optionService: OptionService) {}

   @Post()
   create(@Body() payload: CreateOptionDto) {
      return this.optionService.create(payload);
   }

   @Get()
   findAll() {
      return this.optionService.findAll();
   }

   @Get(':id')
   findOne(@Param() params: ParamIdDto) {
      return this.optionService.findOne(params.id);
   }

   @Patch(':id')
   update(@Param() params: ParamIdDto, @Body() payload: UpdateOptionDto) {
      return this.optionService.update({ id: params.id, payload });
   }

   @Delete(':id')
   remove(@Param() params: ParamIdDto) {
      return this.optionService.remove(params.id);
   }
}
