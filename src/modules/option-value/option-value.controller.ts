import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ParamIdDto } from 'src/base/shared/dto/common.dto';
import { CreateOptionValueDto } from './dto/create-option-value.dto';
import { UpdateOptionValueDto } from './dto/update-option-value.dto';
import { OptionValueService } from './option-value.service';

@Controller('option-value')
export class OptionValueController {
   constructor(private readonly optionValueService: OptionValueService) {}

   @Post()
   create(@Body() payload: CreateOptionValueDto) {
      return this.optionValueService.create(payload);
   }

   @Get(':id')
   findOne(@Param() params: ParamIdDto) {
      return this.optionValueService.findOne(params.id);
   }

   @Patch(':id')
   update(@Param() params: ParamIdDto, @Body() payload: UpdateOptionValueDto) {
      return this.optionValueService.update({ id: params.id, payload });
   }

   @Delete(':id')
   remove(@Param() params: ParamIdDto) {
      return this.optionValueService.remove(params.id);
   }
}
