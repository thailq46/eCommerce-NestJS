import {Module} from '@nestjs/common';
import {LoggingModule} from 'src/base/logging/logging.module';
import {UploadController} from './upload.controller';
import {UploadService} from './upload.service';

@Module({
   imports: [LoggingModule],
   controllers: [UploadController],
   providers: [UploadService],
   exports: [UploadService],
})
export class UploadModule {}
