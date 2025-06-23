import {Module, OnModuleInit} from '@nestjs/common';
import {TypeOrmModule, TypeOrmModuleAsyncOptions, TypeOrmModuleOptions} from '@nestjs/typeorm';
import {config} from 'src/base/config';
import {LoggingService} from 'src/base/logging';
import {DataSource} from 'typeorm';
import {typeOrmOptionsGenerate} from './ormconfig';

const typeOrmOptions: TypeOrmModuleAsyncOptions[] = [
   {
      inject: [],
      useFactory: () =>
         ({
            ...typeOrmOptionsGenerate(config),
         }) as TypeOrmModuleOptions,
   },
];

@Module({
   imports: [...typeOrmOptions.map((options) => TypeOrmModule.forRootAsync(options))],
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
