import {Body, Controller, Delete, Get, Param, Patch, Post, Req} from '@nestjs/common';
import {Request} from 'express';
import {ParamIdDto} from 'src/base/shared/dto/common.dto';
import {CreateSpuDto} from './dto/create-spu.dto';
import {UpdateSpuDto} from './dto/update-spu.dto';
import {SpuService} from './spu.service';

@Controller('spu')
export class SpuController {
   constructor(private readonly spuService: SpuService) {}

   @Post()
   create(@Body() payload: CreateSpuDto, @Req() req: Request) {
      return this.spuService.create(payload, req.user);
   }

   @Get(':id')
   findOne(@Param() {id}: ParamIdDto) {
      return this.spuService.findOne(id);
   }

   @Patch(':id')
   update(@Param() {id}: ParamIdDto, @Body() updateSpuDto: UpdateSpuDto, @Req() req: Request) {
      return this.spuService.update({spu_id: id, payload: updateSpuDto, user: req.user});
   }

   @Delete(':id')
   remove(@Param() {id}: ParamIdDto) {
      return this.spuService.remove(id);
   }
}
