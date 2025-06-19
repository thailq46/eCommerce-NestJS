import {HttpModule} from '@nestjs/axios';
import {Module} from '@nestjs/common';
import {TerminusModule} from '@nestjs/terminus';
import {HttpExternalController} from 'src/modules/http-external/http-external.controller';
import {HttpExternalService} from 'src/modules/http-external/http-external.service';

@Module({
   imports: [
      HttpModule.register({
         timeout: 5000,
         maxRedirects: 5,
      }),
      TerminusModule,
   ],
   controllers: [HttpExternalController],
   providers: [HttpExternalService],
   exports: [HttpExternalService],
})
export class HttpExternalModule {}
