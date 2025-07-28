import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ParamIdDto } from 'src/base/shared/dto/common.dto';
import { QuerySpecificationDto } from 'src/base/shared/dto/query-specification.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderService } from './order.service';

@Controller('order')
export class OrderController {
   constructor(private readonly orderService: OrderService) {}

   @Post()
   createOrder(@Body() payload: CreateOrderDto, @Req() req: Request) {
      return this.orderService.createOrder({ payload, user: req.user });
   }

   @Get()
   findAll(@Query() query: QuerySpecificationDto) {
      return this.orderService.findAll({ query });
   }

   @Get(':id')
   findOne(@Param() params: ParamIdDto) {
      return this.orderService.findOne({ order_id: params.id });
   }

   @Patch(':id')
   updateOrderStatus(@Param() params: ParamIdDto, @Body() payload: UpdateOrderDto) {
      return this.orderService.updateOrderStatus({ order_id: params.id, payload });
   }

   @Delete(':id')
   removeOrder(@Param() params: ParamIdDto) {
      return this.orderService.removeOrder({ order_id: params.id });
   }
}
