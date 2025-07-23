import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from 'src/base/config';
import { LoggingService } from 'src/base/logging';
import { DataSource } from 'typeorm';

@Module({
   imports: [
      TypeOrmModule.forRootAsync({
         inject: [ConfigService],
         useFactory: (config: ConfigService) => ({
            type: 'mysql',
            host: config.DB_HOST,
            port: config.DB_PORT,
            username: config.DB_USERNAME,
            password: config.DB_PASSWORD,
            database: config.DB_DATABASE,
            synchronize: false, // Trong production, ko được để là true
            autoLoadEntities: true,
            // poolSize: 10,
            connectorPackage: 'mysql2',
         }),
      }),
   ],
})
export class DatabaseModule implements OnModuleInit {
   constructor(
      private connection: DataSource,
      private readonly loggingService: LoggingService,
   ) {}

   async onModuleInit() {
      try {
         // Sử dụng connection đã inject qua constructor
         if (this.connection.isInitialized) {
            // console.log('DB Connected successfully');
            this.loggingService.logger.default.log('DB Connected successfully', DatabaseModule.name);
         }
      } catch (error) {
         this.loggingService.logger.default.error(`Failed to connect to DB: ${error}`, DatabaseModule.name);
         // console.error('Failed to connect to DB', error);
      }
   }
}
