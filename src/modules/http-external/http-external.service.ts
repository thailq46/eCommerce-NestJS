import {HttpService} from '@nestjs/axios';
import {Injectable, Logger} from '@nestjs/common';
import * as CircuitBreaker from 'opossum';
import {lastValueFrom} from 'rxjs';

@Injectable()
export class HttpExternalService {
   private readonly logger = new Logger(HttpExternalService.name);
   private circuitBreaker: CircuitBreaker;

   private circuitState = 'CLOSED';
   private metrics = {
      successful: 0,
      failed: 0,
      rejected: 0,
      timeout: 0,
      lastError: null,
      lastErrorTime: null as Date | null,
      lastSuccessTime: null as Date | null,
      totalRequests: 0,
   };
   // Thêm history lưu trữ sự kiện
   private history: Array<{
      timestamp: Date;
      event: string;
      state: string;
      details?: any;
   }> = [];

   constructor(private readonly httpService: HttpService) {
      const breakerOptions = {
         timeout: 3000,
         errorThresholdPercentage: 50,
         resetTimeout: 5000,
         rollingCountBuckets: 10,
         rollingCountTimeout: 10000,
      };

      this.circuitBreaker = new CircuitBreaker(this.callRandomProduct.bind(this), breakerOptions);

      this.circuitBreaker.fallback(this.fallbackCircuitBreaker.bind(this));

      this.setupCircuitListeners();
   }

   private setupCircuitListeners() {
      // Khi circuit mở - service bị cô lập
      this.circuitBreaker.on('open', () => {
         this.circuitState = 'OPEN';
         const message = 'Circuit OPENED: Service isolated due to failures';
         this.logger.warn(message);
         this.addToHistory('OPEN', 'Circuit opened due to failure threshold');
      });

      // Khi circuit bán mở - thử nghiệm kết nối lại
      this.circuitBreaker.on('halfOpen', () => {
         this.circuitState = 'HALF-OPEN';
         const message = 'Circuit HALF-OPEN: Testing service availability';
         this.logger.warn(message);
         this.addToHistory('HALF-OPEN', 'Circuit attempting to recover');
      });

      // Khi circuit đóng - hoạt động bình thường
      this.circuitBreaker.on('close', () => {
         this.circuitState = 'CLOSED';
         const message = 'Circuit CLOSED: Service operating normally';
         this.logger.log(message);
         this.addToHistory('CLOSE', 'Circuit recovered and closed');
      });

      // Khi request thành công
      this.circuitBreaker.on('success', (result) => {
         this.metrics.successful++;
         this.metrics.totalRequests++;
         this.metrics.lastSuccessTime = new Date();
         this.addToHistory('SUCCESS', 'Request succeeded', {result: typeof result});
      });

      // Khi request thất bại
      this.circuitBreaker.on('failure', (error) => {
         this.metrics.failed++;
         this.metrics.totalRequests++;
         this.metrics.lastError = error.message;
         this.metrics.lastErrorTime = new Date();
         this.addToHistory('FAILURE', 'Request failed', {error: error.message});
      });

      // Khi request bị từ chối vì circuit mở
      this.circuitBreaker.on('reject', () => {
         this.metrics.rejected++;
         this.metrics.totalRequests++;
         this.addToHistory('REJECT', 'Request rejected - circuit open');
      });

      // Khi request bị timeout
      this.circuitBreaker.on('timeout', () => {
         this.metrics.timeout++;
         this.metrics.totalRequests++;
         this.addToHistory('TIMEOUT', 'Request timed out');
      });
   }

   private addToHistory(event: string, details: string, data?: any) {
      const historyEvent = {
         timestamp: new Date(),
         event,
         state: this.circuitState,
         details: {
            message: details,
            ...data,
         },
      };

      // Giới hạn lịch sử 100 events
      this.history.unshift(historyEvent);
      if (this.history.length > 100) {
         this.history.pop();
      }
   }
   // Gọi API ngẫu nhiên tới fakestoreapi
   private async callRandomProduct(): Promise<string> {
      const productId = Math.floor(Math.random() * 20) + 1;
      const url = `https://fakestoreapi.com/products/${productId}`;
      this.logger.log(`Calling URL: ${url}`);

      const observable$ = this.httpService.get(url, {
         responseType: 'text', // Vì muốn trả về string như trong Spring
      });

      const res = await lastValueFrom(observable$);
      return res.data;
   }

   private fallbackCircuitBreaker(error: Error) {
      const message = `Fallback triggered due to error: ${error.message}`;
      this.logger.warn(message);
      return {message: 'Service fakestoreapi Error!'};
   }

   async getDataWithCircuitBreaker() {
      const data = await this.circuitBreaker.fire();
      return {data: data, message: 'Circuit Breaker Response from fakestoreapi'};
   }

   // Phương thức lấy metrics và health
   getCircuitBreakerHealth() {
      return {
         state: this.circuitState,
         metrics: {
            ...this.metrics,
            ...this.circuitBreaker.stats,
         },
      };
   }
}
