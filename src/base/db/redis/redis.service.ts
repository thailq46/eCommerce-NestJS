import {
   Injectable,
   InternalServerErrorException,
   NotFoundException,
   OnModuleDestroy,
   OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import {config} from 'src/base/config';
import {LoggingService} from 'src/base/logging';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
   private readonly category = RedisService.name;
   private clients: Record<string, Redis> = {};
   private connectionTimeout: NodeJS.Timeout | null = null;
   private readonly REDIS_CONNECT_TIMEOUT = 10000; // 10s
   private readonly statusConnectRedis = {
      CONNECT: 'connect',
      END: 'end',
      RECONNECT: 'reconnecting',
      ERROR: 'error',
   };

   private readonly REDIS_CONNECT_MESSAGE = {
      code: -99,
      message: {
         vn: 'Không thể kết nối đến Redis',
         en: 'Cannot connect to Redis',
      },
   };

   constructor(private readonly loggingService: LoggingService) {}

   onModuleInit() {
      const isRedisEnabled = true;
      const redisHost = config.REDIS_HOST;
      const redisPort = config.REDIS_PORT;
      const redisPassword = config.REDIS_PASSWORD;

      if (isRedisEnabled) {
         this.initRedisConnection(redisHost, redisPort, redisPassword);
      }
   }

   async onModuleDestroy() {
      await this.closeConnections();
   }

   private initRedisConnection(host: string, port: number, password?: string) {
      try {
         const redisInstance = new Redis({
            host,
            port,
            //   password,
            retryStrategy: (times) => {
               const maxRetryAttempts = 10;
               if (times > maxRetryAttempts) {
                  return null; // Dừng thử lại
               }
               return Math.min(times * 100, 3000);
            },
         });

         this.clients.instanceConnect = redisInstance;
         this.handleEventConnection(redisInstance);

         this.loggingService.logger.default.info(`Attempting to connect to Redis at ${host}:${port}`);
      } catch (error) {
         this.loggingService.logger.default.error(`Failed to initialize Redis connection: ${error.message}`);
         throw error;
      }
   }

   private handleTimeoutError() {
      this.connectionTimeout = setTimeout(() => {
         this.loggingService.logger.default.error('Cannot connect to Redis - connection timeout');
         // console.log(`connectionIORedis - Connection status: timeout`);
         // Trong NestJS, thường không ném lỗi trực tiếp mà xử lý gracefully
         throw new InternalServerErrorException(this.REDIS_CONNECT_MESSAGE.message.vn);
      }, this.REDIS_CONNECT_TIMEOUT);
   }

   private handleEventConnection(redisConnection: Redis) {
      redisConnection.on(this.statusConnectRedis.CONNECT, () => {
         this.loggingService.logger.default.info('connectionIORedis - Connection status: connected');
         // console.log(`connectionIORedis - Connection status: connected`);
         if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
         }
      });

      redisConnection.on(this.statusConnectRedis.END, () => {
         this.loggingService.logger.default.warn('Redis connection ended');
         // console.log(`connectionIORedis - Connection status: disconnected`);
         this.handleTimeoutError();
      });

      redisConnection.on(this.statusConnectRedis.RECONNECT, () => {
         this.loggingService.logger.default.info('Attempting to reconnect to Redis');
         // console.log(`connectionIORedis - Connection status: reconnecting`);
         if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
         }
      });

      redisConnection.on(this.statusConnectRedis.ERROR, (err) => {
         this.loggingService.logger.default.error(`Redis connection error: ${err.message}`);
         // console.log(`connectionIORedis - Connection status: error ${err}`);
         this.handleTimeoutError();
      });
   }

   getClient(name: string = 'instanceConnect'): Redis {
      if (!this.clients[name]) {
         throw new NotFoundException(`Redis client "${name}" not found`);
      }
      return this.clients[name];
   }

   async closeConnections() {
      for (const clientName in this.clients) {
         if (this.clients[clientName]) {
            await this.clients[clientName].quit();
            this.loggingService.logger.default.info(`Closed Redis connection: ${clientName}`);
            console.log(`connectionIORedis - Connection status: closed`);
         }
      }
      this.clients = {};
   }

   async set({key, value}: {key: string; value: any}) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         return await redisCache.set(key, value);
      } catch (error) {
         console.log('RedisService ~ set ~ error', error);
         this.loggingService.logger.default.error(`RedisService ~ set ~ error: ${error}`);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   async get(key: string) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         return await redisCache.get(key);
      } catch (error) {
         console.log('RedisService ~ get ~ error', error);
         this.loggingService.logger.default.error(`RedisService ~ get ~ error: ${error}`);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   async setCacheWithExpireTime({key, value, expireTime}: {key: string; value: any; expireTime: number}) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         return await redisCache.set(key, value, 'EX', expireTime);
      } catch (error) {
         console.log('RedisService ~ setCacheWithExpireTime ~ error', error);
         this.loggingService.logger.default.error(`RedisService ~ setCacheWithExpireTime ~ error: ${error}`);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }
}
