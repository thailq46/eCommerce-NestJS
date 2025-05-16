import {Module, OnModuleInit} from '@nestjs/common';
import {TypeOrmModule, TypeOrmModuleAsyncOptions, TypeOrmModuleOptions} from '@nestjs/typeorm';

import {config} from 'src/base/config';
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
   constructor(private connection: DataSource) {}

   async onModuleInit() {
      try {
         // Sử dụng connection đã inject qua constructor
         if (this.connection.isInitialized) {
            console.log('DB Connected successfully');
         }
      } catch (error) {
         console.error('Failed to connect to DB', error);
      }
   }
}
