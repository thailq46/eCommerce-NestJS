import { Injectable } from '@nestjs/common';
import { CreateSpuDto } from './dto/create-spu.dto';
import { UpdateSpuDto } from './dto/update-spu.dto';

@Injectable()
export class SpuService {
  create(createSpuDto: CreateSpuDto) {
    return 'This action adds a new spu';
  }

  findAll() {
    return `This action returns all spu`;
  }

  findOne(id: number) {
    return `This action returns a #${id} spu`;
  }

  update(id: number, updateSpuDto: UpdateSpuDto) {
    return `This action updates a #${id} spu`;
  }

  remove(id: number) {
    return `This action removes a #${id} spu`;
  }
}
