import {
   Body,
   ClassSerializerInterceptor,
   Controller,
   Delete,
   Get,
   Param,
   Patch,
   Post,
   Query,
   UseInterceptors,
} from '@nestjs/common';
import {ParamIdDto} from 'src/base/shared/dto/common.dto';
import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
import {UpdateUserDto} from 'src/modules/user/dto/update-user.dto';
import {CreateUserDto} from './dto/create-user.dto';
import {UserService} from './user.service';

// Xử lý dữ liệu trước khi trả về cho client
@UseInterceptors(ClassSerializerInterceptor)
@Controller('user')
export class UserController {
   constructor(private readonly userService: UserService) {}

   @Post()
   create(@Body() createUserDto: CreateUserDto) {
      return this.userService.create(createUserDto);
   }

   @Get()
   findAll(@Query() query: QuerySpecificationDto) {
      return this.userService.findAll(query);
   }

   @Get(':id')
   findOne(@Param() params: ParamIdDto) {
      return this.userService.findOne(params.id);
   }

   @Patch(':id')
   update(@Param() params: ParamIdDto, @Body() updateUserDto: UpdateUserDto) {
      return this.userService.update(params.id, updateUserDto);
   }

   @Delete(':id')
   remove(@Param() params: ParamIdDto) {
      return this.userService.remove(params.id);
   }
}
