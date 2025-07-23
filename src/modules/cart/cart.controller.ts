import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ParamIdDto } from 'src/base/shared/dto/common.dto';
import { CartService } from './cart.service';
import { CreateCartDto, UpdateCartQuantityDto } from './dto/create-cart.dto';

@Controller('cart')
export class CartController {
   constructor(private readonly cartService: CartService) {}

   @Post()
   createCart(@Body() payload: CreateCartDto, @Req() req: Request) {
      return this.cartService.createCart({ data: payload, user: req.user });
   }

   @Get(':id')
   findOne(@Param() { id }: ParamIdDto, @Req() req: Request) {
      return this.cartService.findOne({ cart_id: id, user: req.user });
   }

   @Patch(':id/quantity')
   updateQuantity(@Param() { id }: ParamIdDto, @Body() payload: UpdateCartQuantityDto, @Req() req: Request) {
      return this.cartService.updateQuantity({ cart_id: id, payload, user: req.user });
   }

   @Delete(':id')
   remove(@Param() { id }: ParamIdDto, @Req() req: Request) {
      return this.cartService.removeCart({ cart_id: id, user: req.user });
   }
}
