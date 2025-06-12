import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Shop} from 'src/modules/shop/entities/shop.entity';
import {ShopController} from './shop.controller';
import {ShopService} from './shop.service';

@Module({
   imports: [TypeOrmModule.forFeature([Shop])],
   controllers: [ShopController],
   providers: [ShopService],
   exports: [ShopService],
})
export class ShopModule {}
