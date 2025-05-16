import {TypeOrmModuleOptions} from '@nestjs/typeorm';
import {ConfigService} from 'src/base/config';

export const typeOrmOptionsGenerate = (config: ConfigService) =>
   ({
      type: config.DB_TYPE,
      host: config.DB_HOST,
      port: config.DB_PORT,
      username: config.DB_USERNAME,
      password: config.DB_PASSWORD,
      database: config.DB_DATABASE,
      synchronize: true,
      autoLoadEntities: true,
   }) as TypeOrmModuleOptions;
