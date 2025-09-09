import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';
import helmet from 'helmet';
import { join } from 'path';
import { config } from 'src/base/config';
import { LoggingService } from 'src/base/logging';
import { useMorgan } from 'src/base/middleware/morgan.middleware';
import { ResponseTransformInterceptor } from 'src/base/middleware/response.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
   const app = await NestFactory.create<NestExpressApplication>(AppModule);
   app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
         client: {
            brokers: ['localhost:9193'],
            clientId: 'nest-kafka-app',
            connectionTimeout: 15000,
            requestTimeout: 30000,
         },
         consumer: {
            groupId: 'NESTJS-ECOM',
            allowAutoTopicCreation: true,
            sessionTimeout: 30000, // Thời gian tối đa mà consumer có thể không gửi heartbeat trước khi bị coi là đã chết và bị xóa khỏi nhóm
            heartbeatInterval: 3000, // Khoảng thời gian mà consumer sẽ gửi heartbeat đến Kafka để xác nhận rằng nó vẫn đang hoạt động.
            retry: {
               retries: 5,
               initialRetryTime: 1000,
            },
         },
      },
   });

   // Consumer 2
   app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
         client: { brokers: ['localhost:9193'], clientId: 'consumer-2' },
         consumer: { groupId: 'NESTJS-ECOM' },
      },
   });

   // Consumer 3
   app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
         client: { brokers: ['localhost:9193'], clientId: 'consumer-3' },
         consumer: { groupId: 'NESTJS-ECOM' },
      },
   });
   const reflector = app.get(Reflector);
   // Logging
   const loggingService = app.get(LoggingService);
   const logger = loggingService.getLogger();

   // Enable CORS
   app.enableCors(config.CORS);

   // const myLogger = new MyLogger();
   // app.useLogger(myLogger);

   // Init Middleware
   app.use(useMorgan(loggingService.logger.access));
   app.use(helmet());
   app.use(compression());

   // Enable validation pipe globally
   app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

   // Set global prefix
   app.setGlobalPrefix(config.API_NAMESPACE, {
      exclude: ['/metrics'],
   });

   app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));

   // Set static assets directory
   app.useStaticAssets(join(__dirname, `../${config.UPLOAD_PATH}`), {
      prefix: `/${config.UPLOAD_PATH}`,
   });

   // Start app
   await app.startAllMicroservices();
   await app.listen(config.PORT);
   logger.info('Server time: ' + new Date().toString());
   logger.info(`Local/public ip: ${String(config.LOCAL_IP)} - ${String(config.PUBLIC_IP)}`);
   logger.info(`Running app on: ${config.HOST}`);
}

void bootstrap();
