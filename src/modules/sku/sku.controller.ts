import {Controller, Get, Query} from '@nestjs/common';
import {QuerySkuDto} from 'src/modules/sku/dto/query-sku.dto';
import {SkuService} from './sku.service';

@Controller('sku')
export class SkuController {
   constructor(private readonly skuService: SkuService) {}

   @Get('/select_variation')
   findOneSku(@Query() query: QuerySkuDto) {
      return this.skuService.findOneSku({
         sku_id: query.sku_id,
         product_id: query.product_id,
      });
   }
}
