import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { RefreshToken } from './modules/refresh-tokens/entities/refresh-token.entity';

dotenv.config({ path: '.env.dev' });

// __dirname: D:\Github\thailq46\eCommerce-NestJS\my-app\src
// Generate: npx ts-node ./node_modules/typeorm/cli migration:generate ./migrations/refresh-token/RF -d ./src/data-source.ts
// Run: npx ts-node ./node_modules/typeorm/cli migration:run -d ./src/data-source.ts
// Revert: npx ts-node ./node_modules/typeorm/cli migration:revert -d ./src/data-source.ts

export const AppDataSource = new DataSource({
   type: 'mysql',
   host: process.env.DB_HOST,
   port: Number(process.env.DB_PORT),
   username: process.env.DB_USERNAME,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_DATABASE,
   entities: [RefreshToken],
   migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
   synchronize: false,
   logging: true,
});
