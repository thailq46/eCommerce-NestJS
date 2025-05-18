import { Module } from '@nestjs/common';
import { SpuService } from './spu.service';
import { SpuController } from './spu.controller';

@Module({
  controllers: [SpuController],
  providers: [SpuService],
})
export class SpuModule {}
