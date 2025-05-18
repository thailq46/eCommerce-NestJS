import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SpuService } from './spu.service';
import { CreateSpuDto } from './dto/create-spu.dto';
import { UpdateSpuDto } from './dto/update-spu.dto';

@Controller('spu')
export class SpuController {
  constructor(private readonly spuService: SpuService) {}

  @Post()
  create(@Body() createSpuDto: CreateSpuDto) {
    return this.spuService.create(createSpuDto);
  }

  @Get()
  findAll() {
    return this.spuService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.spuService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSpuDto: UpdateSpuDto) {
    return this.spuService.update(+id, updateSpuDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.spuService.remove(+id);
  }
}
