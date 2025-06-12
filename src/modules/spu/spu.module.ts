import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ShopModule} from 'src/modules/shop/shop.module';
import {Sku} from 'src/modules/sku/entities/sku.entity';
import {Spu} from 'src/modules/spu/entities/spu.entity';
import {SpuController} from './spu.controller';
import {SpuService} from './spu.service';

@Module({
   imports: [TypeOrmModule.forFeature([Spu, Sku]), ShopModule],
   controllers: [SpuController],
   providers: [SpuService],
})
export class SpuModule {}
