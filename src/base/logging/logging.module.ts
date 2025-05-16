import {Global, Module} from '@nestjs/common';
import {LoggingService} from './logging.service';

@Global()
@Module({
  imports: [],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
