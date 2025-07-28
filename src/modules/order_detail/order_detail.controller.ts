import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateOrderDetailDto } from './dto/create-order_detail.dto';
import { UpdateOrderDetailDto } from './dto/update-order_detail.dto';
import { OrderDetailService } from './order_detail.service';

@Controller('order-detail')
export class OrderDetailController {
   constructor(private readonly orderDetailService: OrderDetailService) {}

   @Post()
   create(@Body() createOrderDetailDto: CreateOrderDetailDto) {
      return this.orderDetailService.create(createOrderDetailDto);
   }

   @Get()
   findAll() {
      return this.orderDetailService.findAll();
   }

   @Get(':id')
   findOne(@Param('id') id: string) {
      return this.orderDetailService.findOne(+id);
   }

   @Patch(':id')
   update(@Param('id') id: string, @Body() updateOrderDetailDto: UpdateOrderDetailDto) {
      return this.orderDetailService.update(+id, updateOrderDetailDto);
   }

   @Delete(':id')
   remove(@Param('id') id: string) {
      return this.orderDetailService.remove(+id);
   }
}
