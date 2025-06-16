// filepath: src/modules/upload/upload.controller.ts
import {
   BadRequestException,
   Body,
   Controller,
   Delete,
   Get,
   Post,
   Query,
   UploadedFile,
   UploadedFiles,
   UseInterceptors,
} from '@nestjs/common';
import {FileInterceptor, FilesInterceptor} from '@nestjs/platform-express';
import * as path from 'path';
import {Public} from 'src/base/decorators/customize.decorator';
import {multerStorage} from './oss';
import {UploadService} from './upload.service';

@Controller('upload')
export class UploadController {
   constructor(private readonly uploadService: UploadService) {}

   @Post('avatar')
   @UseInterceptors(
      FileInterceptor('file', {
         dest: 'uploads',
         storage: multerStorage,
         limits: {fileSize: 1024 * 1024 * 3},
         fileFilter: (req, file, cb) => {
            const extName = path.extname(file.originalname).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif'].includes(extName)) {
               cb(null, true);
            } else {
               cb(new BadRequestException('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)'), false);
            }
         },
      }),
   )
   uploadAvatar(@UploadedFile() file: Express.Multer.File) {
      return this.uploadService.uploadAvatar(file);
   }

   @Public()
   @Post('large-file')
   @UseInterceptors(FilesInterceptor('files', 20, {dest: 'uploads'}))
   uploadLargeFile(
      @UploadedFiles() files: Array<Express.Multer.File>,
      @Body()
      body: {
         name: string;
         chunkIndex: string;
         totalChunks: string;
         originalName: string;
      },
   ) {
      return this.uploadService.uploadLargeFileChunks(files, body);
   }

   @Public()
   @Get('merge/file')
   mergeFile(@Query('fileName') fileName: string) {
      return this.uploadService.mergeFileChunks(fileName);
   }

   @Public()
   @Delete('cleanup/chunks')
   cleanupAllChunks() {
      return this.uploadService.cleanupAllChunkDirectories();
   }

   @Public()
   @Get('statistics')
   getStatistics() {
      return this.uploadService.getUploadStatistics();
   }

   // @Public()
   // @Post('/upload/large-file')
   // @UseInterceptors(FilesInterceptor('files', 20, {dest: 'uploads'}))
   // uploadLargeFile(@UploadedFiles() files: Array<Express.Multer.File>, @Body() body: {name: string}) {
   //    console.log('Files:', files);
   //    console.log('Body:', body);
   //    // 1. Get file name
   //    const fileName = body.name.match(/(.+)-\d+$/)?.[1] ?? body.name;
   //    console.log('File Name:', fileName);
   //    const nameDir = `uploads/chunks-${fileName}`;
   //    // 2. Create directory if not exists
   //    if (!fs.existsSync(nameDir)) {
   //       fs.mkdirSync(nameDir);
   //    }
   //    // 3. Move files to the directory
   //    fs.cpSync(files[0].path, nameDir + '/' + body.name);
   //    // 4. Remove original file
   //    fs.rmSync(files[0].path, {force: true});
   //    return {
   //       message: 'Upload file thành công',
   //       // data: {file_path: file.path},
   //    };
   // }

   // @Public()
   // @Get('/merge/file')
   // mergeFile(@Query('fileName') fileName: string) {
   //    const nameDir = `uploads/chunks-${fileName}`;
   //    console.log('UserController ~ mergeFile ~ nameDir', nameDir);
   //    // Read
   //    const files = fs.readdirSync(nameDir);
   //    console.log('UserController ~ mergeFile ~ files', files);
   //    let startPos = 0,
   //       countFile = 0;
   //    files.map((file) => {
   //       const filePath = nameDir + '/' + file;
   //       console.log('File Path:', filePath);
   //       const streamFile = fs.createReadStream(filePath);
   //       streamFile
   //          .pipe(
   //             fs.createWriteStream('uploads/static/' + fileName, {
   //                start: startPos,
   //             }),
   //          )
   //          .on('finish', () => {
   //             countFile++;
   //             console.log(`File ${file} merged successfully, count: ${countFile}`);
   //             if (countFile === files.length) {
   //                fs.rm(nameDir, {force: true, recursive: true}, (err) => {
   //                   if (err) {
   //                      console.error('Error removing directory:', err);
   //                   } else {
   //                      console.log('Directory removed successfully');
   //                   }
   //                });
   //             }
   //          });
   //       startPos += fs.statSync(filePath).size;
   //    });
   //    return {
   //       message: 'Merge file thành công',
   //       data: {
   //          file_path: `http://localhost:3005/uploads/static/${fileName}`,
   //          file_name: fileName,
   //       },
   //    };
   // }
}
