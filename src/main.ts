import {ValidationPipe} from '@nestjs/common';
import {NestFactory, Reflector} from '@nestjs/core';
import {NestExpressApplication} from '@nestjs/platform-express';
import * as compression from 'compression';
import helmet from 'helmet';
import {join} from 'path';
import {config} from 'src/base/config';
import {LoggingService} from 'src/base/logging';
import {MyLogger} from 'src/base/logging/my.logger';
import {useMorgan} from 'src/base/middleware/morgan.middleware';
import {ResponseTransformInterceptor} from 'src/base/middleware/response.interceptor';
import {AppModule} from './app.module';

async function bootstrap() {
   const app = await NestFactory.create<NestExpressApplication>(AppModule);
   const reflector = app.get(Reflector);

   // Logging
   const loggingService = app.get(LoggingService);
   const logger = loggingService.getLogger();

   // Enable CORS
   app.enableCors(config.CORS);

   const myLogger = new MyLogger();
   app.useLogger(myLogger);

   // Init Middleware
   app.use(useMorgan(loggingService.logger.access));
   app.use(helmet());
   app.use(compression());

   // Enable validation pipe globally
   app.useGlobalPipes(new ValidationPipe({whitelist: true}));

   // Set global prefix
   app.setGlobalPrefix(config.API_NAMESPACE);

   app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));

   // Set static assets directory
   app.useStaticAssets(join(__dirname, '../uploads'), {
      prefix: '/uploads',
   });

   // Start app
   await app.listen(config.PORT);
   logger.info('Server time: ' + new Date().toString());
   logger.info(`Local/public ip: ${String(config.LOCAL_IP)} - ${String(config.PUBLIC_IP)}`);
   logger.info(`Running app on: ${config.HOST}`);
}

void bootstrap();
