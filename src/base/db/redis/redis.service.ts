import {
   Injectable,
   InternalServerErrorException,
   NotFoundException,
   OnModuleDestroy,
   OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { config } from 'src/base/config';
import { LockParams, TryLockParams } from 'src/base/db/redis/redis.interface';
import { LoggingService } from 'src/base/logging';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
   private readonly category = RedisService.name;
   private clients: Record<string, Redis> = {};
   private subscriberClient: Redis | null = null;
   private publisherClient: Redis | null = null;
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

   constructor(private readonly loggingService: LoggingService) {
      this.subscriberClient = new Redis({ host: config.REDIS_HOST, port: config.REDIS_PORT });
      this.publisherClient = new Redis({ host: config.REDIS_HOST, port: config.REDIS_PORT });
   }

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
      await this.subscriberClient?.quit();
      await this.publisherClient?.quit();
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
         this.loggingService.getLogger(this.category).error(`Failed to initialize Redis connection: ${error.message}`);
         throw new InternalServerErrorException(this.REDIS_CONNECT_MESSAGE.message.vn);
      }
   }

   private handleTimeoutError() {
      this.connectionTimeout = setTimeout(() => {
         this.loggingService.getLogger(this.category).error('Cannot connect to Redis - connection timeout');
         // Trong NestJS, thường không ném lỗi trực tiếp mà xử lý gracefully
         throw new InternalServerErrorException(this.REDIS_CONNECT_MESSAGE.message.vn);
      }, this.REDIS_CONNECT_TIMEOUT);
   }

   publish(channel: string, message: string) {
      return new Promise((resolve, reject) => {
         void this.publisherClient?.publish(channel, message, (err, reply) => {
            if (err) {
               this.loggingService.getLogger(this.category).error(`Publish error: ${err.message}`);
               return reject(err);
            }
            this.loggingService.getLogger(this.category).log(`Message published to channel [${channel}]: ${message}`);
            resolve(reply);
         });
      });
   }

   subscribe(channel: string, callback: (message: string) => void) {
      void this.subscriberClient?.subscribe(channel);
      this.subscriberClient?.on('message', (subscribedChannel, message) => {
         if (subscribedChannel === channel) {
            this.loggingService.getLogger(this.category).log(`Message received on channel [${channel}]: ${message}`);
            callback(message);
         }
      });
   }

   private handleEventConnection(redisConnection: Redis) {
      redisConnection.on(this.statusConnectRedis.CONNECT, () => {
         this.loggingService.getLogger(this.category).info('connectionIORedis - Connection status: connected');
         if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
         }
      });

      redisConnection.on(this.statusConnectRedis.END, () => {
         this.loggingService.getLogger(this.category).warn('Redis connection ended');
         this.handleTimeoutError();
      });

      redisConnection.on(this.statusConnectRedis.RECONNECT, () => {
         this.loggingService.getLogger(this.category).info('Attempting to reconnect to Redis');
         if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
         }
      });

      redisConnection.on(this.statusConnectRedis.ERROR, (err) => {
         this.loggingService.getLogger(this.category).error(`Redis connection error: ${err.message}`);
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
            this.loggingService.getLogger(this.category).info(`Closed Redis connection: ${clientName}`);
         }
      }
      this.clients = {};
   }

   async set({ key, value }: { key: string; value: any }) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         return await redisCache.set(key, value);
      } catch (error) {
         this.loggingService.getLogger(this.category).error(`set ~ error: ${error}`);
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
         this.loggingService.getLogger(this.category).error(`get ~ error: ${error}`);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   async setCacheWithExpireTime({ key, value, expireTime }: { key: string; value: any; expireTime: number }) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         return await redisCache.set(key, value, 'EX', expireTime);
      } catch (error) {
         this.loggingService.getLogger(this.category).error(`setCacheWithExpireTime ~ error: ${error}`);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   // 0: Failed to delete, 1: Deleted successfully
   async del(key: string) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         return await redisCache.del(key);
      } catch (error) {
         this.loggingService.getLogger(this.category).error(`del ~ error: ${error}`);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   // DISTRIBUTED LOCK
   async tryLock({ keyLock, value, waitTime, leaseTime, unit }: TryLockParams) {
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
               this.loggingService
                  .getLogger(this.category)
                  .info(`tryLock ~ Successfully acquired lock for key: ${keyLock}`);
               return true; // Lấy khóa thành công
            }
            // Chờ một khoảng ngắn trước khi thử lại
            await new Promise((resolve) => setTimeout(resolve, 100)); // Chờ 100ms giữa các lần thử
         }
         return false; // Không lấy được khóa sau waitTime
      } catch (error) {
         this.loggingService.getLogger(this.category).error(`tryLock ~ error: ${error}`);
         throw new InternalServerErrorException('Cannot connect to Redis');
      }
   }

   async lock({ keyLock, value, leaseTime, unit, options = {} }: LockParams) {
      try {
         const redisCache = this.getClient();
         if (!redisCache) {
            throw new InternalServerErrorException('Cannot connect to Redis');
         }
         const { timeout = 5000, maxRetries = 5, retryDelay = 100 } = options;
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
         this.loggingService.getLogger(this.category).error(`lock ~ error: ${error}`);
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
            this.loggingService.getLogger(this.category).warn(`unlock ~ No lock found for key: ${keyLock}`);
         } else {
            this.loggingService.getLogger(this.category).info(`unlock ~ Successfully unlocked key: ${keyLock}`);
         }
      } catch (error) {
         this.loggingService.getLogger(this.category).error(`unlock ~ error: ${error}`);
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
