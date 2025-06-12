import {Injectable} from '@nestjs/common';
import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface';
import * as customEnv from 'custom-env';
import * as ip from 'ip';
import * as ms from 'ms';

import {DEFAULT_CACHE_LONG_TIMEOUT, DEFAULT_CACHE_TIMEOUT} from './config.constants';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'dev';
const customEnvName = process.env.DOT_ENV_SUFFIX ?? process.env.NODE_ENV;
console.log('Using NODE_ENV: ' + process.env.NODE_ENV);
console.log('Using customEnvName: ' + customEnvName);
customEnv.env(customEnvName);
const _process = {env: process.env};
process.env = {};

@Injectable()
export class ConfigService {
   // COMMON
   DEV = 'dev';
   PROD = 'prod';
   DEBUG = (_process.env.DEBUG ?? 'false').toLowerCase() !== 'false';
   NODE_ENV = _process.env.NODE_ENV;
   UPLOAD_LIMIT = parseInt(_process.env.UPLOAD_LIMIT ?? '5242880', 10); // Byte
   UPLOAD_PATH = _process.env.UPLOAD_PATH ?? 'uploads/';

   // NETWORK
   LOCAL_IP: string = ip.address();
   PUBLIC_IP: string = _process.env.PUBLIC_IP ?? this.LOCAL_IP;
   PORT: number = +(_process.env.PORT ?? 3000);
   HOST = `http://${this.PUBLIC_IP}:${this.PORT}`;
   DOMAIN = _process.env.DOMAIN;
   API_NAMESPACE = _process.env.API_NAMESPACE ?? 'api/v1';
   API_DOC_URL = '';

   // MIDDLEWARE
   FIXED_STATUS_CODE = (_process.env.SENTRY_LOG ?? 'true').toLowerCase() === 'true';
   RATE_LIMIT = {
      windowMs: 60 * 1000,
      max: parseInt(_process.env.RATE_LIMIT_MIN ?? '120', 10),
   };
   CORS: CorsOptions = {
      origin: true,
      credentials: true,
      methods: ['POST', 'PUT', 'GET', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders:
         'content-type, authorization, accept-encoding, user-agent, accept, cache-control, connection, cookie',
      exposedHeaders: 'X-RateLimit-Reset, set-cookie, Content-Disposition, X-File-Name',
   };

   // DB
   DB_TYPE = _process.env.DB_TYPE ?? 'mysql';
   DB_HOST = _process.env.DB_HOST ?? '127.0.0.1';
   DB_PORT = parseInt(_process.env.DB_PORT ?? '3306', 10);
   DB_USERNAME = _process.env.DB_USERNAME ?? 'root';
   DB_PASSWORD = _process.env.DB_PASSWORD ?? '';
   DB_DATABASE = _process.env.DB_DATABASE ?? '';

   REDIS_HOST = _process.env.REDIS_HOST ?? '127.0.0.1';
   REDIS_PORT = parseInt(_process.env.REDIS_PORT ?? '6379', 10);
   REDIS_PASSWORD = _process.env.REDIS_PASSWORD;

   CACHE_TIMEOUT = ms(_process.env.CACHE_TIMEOUT ?? DEFAULT_CACHE_TIMEOUT);
   CACHE_LONG_TIMEOUT = ms(_process.env.CACHE_LONG_TIMEOUT ?? DEFAULT_CACHE_LONG_TIMEOUT);
   CACHE_SETTING_TIMEOUT = 0;
   CACHE_DB_TIMEOUT = ms('5s');

   // USER
   REFRESH_SECRET = _process.env.REFRESH_SECRET ?? 'refresh_token_secret';
   REFRESH_TOKEN_EXP = _process.env.REFRESH_TOKEN_EXP ?? '30d';
   ACCESS_SECRET = _process.env.ACCESS_SECRET ?? 'access_token_secret';
   ACCESS_TOKEN_EXP = _process.env.ACCESS_TOKEN_EXP ?? '1d';

   // MAIL
   EMAIL_USE_TLS = (_process.env.EMAIL_USE_TLS ?? 'true').toLowerCase() === 'true';
   EMAIL_HOST = _process.env.EMAIL_HOST ?? 'smtp.gmail.com';
   EMAIL_USER = _process.env.EMAIL_USER ?? '';
   EMAIL_PASSWORD = _process.env.EMAIL_PASSWORD ?? '';
   EMAIL_PORT = parseInt(_process.env.EMAIL_PORT ?? '587', 10);
}

export const config = new ConfigService();
