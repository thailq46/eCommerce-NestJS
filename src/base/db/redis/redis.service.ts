import {
   Injectable,
   InternalServerErrorException,
   NotFoundException,
   OnModuleDestroy,
   OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import {config} from 'src/base/config';
import {LockParams, TryLockParams} from 'src/base/db/redis/redis.interface';
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
      } catch (error) {
         this.loggingService.logger.default.error(
            `Failed to initialize Redis connection: ${error.message}`,
            this.category,
         );
         throw error;
      }
   }

   private handleTimeoutError() {
      this.connectionTimeout = setTimeout(() => {
         this.loggingService.logger.default.error('Cannot connect to Redis - connection timeout', this.category);
         // console.log(`connectionIORedis - Connection status: timeout`);
         // Trong NestJS, thường không ném lỗi trực tiếp mà xử lý gracefully
         throw new InternalServerErrorException(this.REDIS_CONNECT_MESSAGE.message.vn);
      }, this.REDIS_CONNECT_TIMEOUT);
   }

   private handleEventConnection(redisConnection: Redis) {
      redisConnection.on(this.statusConnectRedis.CONNECT, () => {
         this.loggingService.logger.default.info('connectionIORedis - Connection status: connected', this.category);
         // console.log(`connectionIORedis - Connection status: connected`);
         if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
         }
      });

      redisConnection.on(this.statusConnectRedis.END, () => {
         this.loggingService.logger.default.warn('Redis connection ended', this.category);
         // console.log(`connectionIORedis - Connection status: disconnected`);
         this.handleTimeoutError();
      });

      redisConnection.on(this.statusConnectRedis.RECONNECT, () => {
         this.loggingService.logger.default.info('Attempting to reconnect to Redis', this.category);
         // console.log(`connectionIORedis - Connection status: reconnecting`);
         if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
         }
      });

      redisConnection.on(this.statusConnectRedis.ERROR, (err) => {
         this.loggingService.logger.default.error(`Redis connection error: ${err.message}`, this.category);
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
            this.loggingService.logger.default.info(`Closed Redis connection: ${clientName}`, this.category);
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
         this.loggingService.logger.default.error(`set ~ error: ${error}`, this.category);
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
         this.loggingService.logger.default.error(`get ~ error: ${error}`, this.category);
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
         this.loggingService.logger.default.error(`setCacheWithExpireTime ~ error: ${error}`, this.category);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   // DISTRIBUTED LOCK
   async tryLock({keyLock, value, waitTime, leaseTime, unit}: TryLockParams) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }

         const ttl = unit === 'seconds' ? leaseTime * 1000 : leaseTime;
         const waitMs = unit === 'seconds' ? waitTime * 1000 : waitTime;
         const startTime = Date.now();

         while (Date.now() - startTime < waitMs) {
            const result = await redisCache.set(keyLock, value, 'PX', ttl, 'NX');
            if (result === 'OK') {
               this.loggingService.logger.default.info(
                  `tryLock ~ Successfully acquired lock for key: ${keyLock}`,
                  this.category,
               );
               return true; // Lấy khóa thành công
            }
            // Chờ một khoảng ngắn trước khi thử lại
            await new Promise((resolve) => setTimeout(resolve, 100)); // Chờ 100ms giữa các lần thử
         }

         return false; // Không lấy được khóa sau waitTime
      } catch (error) {
         this.loggingService.logger.default.error(`tryLock ~ error: ${error}`, this.category);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   async lock({keyLock, value, leaseTime, unit, options = {}}: LockParams) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         const {timeout = 5000, maxRetries = 5, retryDelay = 100} = options;
         const ttl = unit === 'seconds' ? leaseTime * 1000 : leaseTime;
         let attempts = 0;
         const startTime = Date.now();
         while (attempts < maxRetries && Date.now() - startTime < timeout) {
            const result = await redisCache.set(keyLock, value, 'PX', ttl, 'NX');
            if (result === 'OK') return;
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
         }
      } catch (error) {
         this.loggingService.logger.default.error(`lock ~ error: ${error}`, this.category);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   async unlock(keyLock: string): Promise<void> {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         // Xóa khóa hiện tại
         const result = await redisCache.del(keyLock);
         if (result === 0) {
            this.loggingService.logger.default.warn(`unlock ~ No lock found for key: ${keyLock}`, this.category);
         } else {
            this.loggingService.logger.default.info(`unlock ~ Successfully unlocked key: ${keyLock}`, this.category);
         }
      } catch (error) {
         this.loggingService.logger.default.error(`unlock ~ error: ${error}`, this.category);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   async forceUnlockIfExists(keyLock: string): Promise<void> {
      const currentValue = await this.getClient().get(keyLock);
      if (currentValue) {
         // Chỉ xóa nếu khóa vẫn tồn tại, nhưng không kiểm tra value để buộc unlock
         await this.getClient().del(keyLock);
         // this.loggingService.logger.default.info(
         //    `[forceUnlockIfExists]: Forced unlock for key: ${keyLock}`,
         //    this.category,
         // );
      } else {
         // this.loggingService.logger.default.info(
         //    `[forceUnlockIfExists]: No lock to unlock for key: ${keyLock}`,
         //    this.category,
         // );
      }
   }

   async isLocked(keyLock: string): Promise<boolean> {
      const value = await this.getClient().get(keyLock);
      return !!value;
   }
}
