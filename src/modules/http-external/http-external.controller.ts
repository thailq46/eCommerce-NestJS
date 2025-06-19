import {Controller, Get, Logger} from '@nestjs/common';
import {HealthCheck, HealthCheckService, HttpHealthIndicator} from '@nestjs/terminus';
import {Public} from 'src/base/decorators/customize.decorator';
import {HttpExternalService} from './http-external.service';

@Controller('external')
export class HttpExternalController {
   private readonly logger = new Logger(HttpExternalController.name);
   constructor(
      private readonly httpExternalService: HttpExternalService,
      private readonly health: HealthCheckService,
      private readonly http: HttpHealthIndicator,
   ) {}

   @Public()
   @Get()
   async testCircuitBreaker() {
      return await this.httpExternalService.getDataWithCircuitBreaker();
   }

   @Public()
   @Get('health')
   @HealthCheck()
   async check() {
      try {
         // Sử dụng health check nhưng bắt exception
         const healthResult = await this.health.check([
            // Kiểm tra các endpoints API
            () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),

            // Kiểm tra trạng thái Circuit Breaker
            () => {
               const health = this.httpExternalService.getCircuitBreakerHealth();
               const isHealthy = health.state !== 'OPEN';

               return {
                  circuitBreaker: {
                     status: isHealthy ? 'up' : 'down',
                     state: health.state,
                     metrics: {
                        totalRequests: health.metrics.totalRequests,
                        successful: health.metrics.successful,
                        failed: health.metrics.failed,
                        rejected: health.metrics.rejected,
                        timeout: health.metrics.timeout,
                     },
                  },
               };
            },
         ]);

         // Nếu success, trả về status UP
         return {
            data: {
               status: 'ok',
               timestamp: new Date().toISOString(),
               services: healthResult,
               message: 'All services are healthy',
            },
         };
      } catch (error) {
         // Log lỗi để debug
         this.logger.error(`Health Check has failed! ${JSON.stringify(error.response)}`);

         // Trả về response với status code 200 nhưng data cho biết service down
         return {
            data: {
               status: 'error',
               timestamp: new Date().toISOString(),
               services: error.response,
               message: 'Health Check has failed!',
               details: error.response?.error || error.response,
            },
         };
      }
   }
}
