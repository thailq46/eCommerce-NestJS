import {
   BadRequestException,
   Body,
   ClassSerializerInterceptor,
   Controller,
   Delete,
   Get,
   Param,
   Patch,
   Post,
   Query,
   UploadedFile,
   UseInterceptors,
} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import * as path from 'path';
import {ParamIdDto} from 'src/base/shared/dto/common.dto';
import {QuerySpecificationDto} from 'src/base/shared/dto/query-specification.dto';
import {multerStorage} from 'src/modules/upload/oss';
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

   @Post('/upload/avt')
   @UseInterceptors(
      FileInterceptor('file', {
         dest: 'uploads/avatar',
         storage: multerStorage,
         limits: {
            fileSize: 1024 * 1024 * 3,
         },
         fileFilter: (req, file, cb) => {
            const extName = path.extname(file.originalname);
            if (['.jpg', '.jpeg', '.png', '.gif'].includes(extName)) {
               cb(null, true);
            } else {
               cb(new BadRequestException('Upload file error'), false);
            }
         },
      }),
   )
   uploadFile(@UploadedFile() file: Express.Multer.File) {
      return {
         message: 'Upload file thành công',
         data: {file_path: file.path},
      };
   }
}
