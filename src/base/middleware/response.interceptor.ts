import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

export interface Response<T> {
   statusCode: number;
   message?: string;
   data: T;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
   constructor(private reflector: Reflector) {}

   intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
      // Kiểm tra nếu là endpoint metrics thì bỏ qua interceptor
      if (this.isMetricsEndpoint(context)) {
         return next.handle();
      }
      return next.handle().pipe(
         map((response) => {
            if (response && typeof response === 'object') {
               // Kiểm tra xem response có meta không
               if ('meta' in response && 'data' in response) {
                  return {
                     statusCode: context.switchToHttp().getResponse().statusCode,
                     message: response?.message || 'Success',
                     data: response?.data || null,
                     meta: response?.meta || null,
                  };
               }
            }
            // Trường hợp mặc định, response là data
            return {
               statusCode: context.switchToHttp().getResponse().statusCode,
               message: response?.message || 'Success',
               data: response?.data || null,
            };
         }),
      );
   }

   /**
    * Kiểm tra xem request có phải là endpoint metrics hay không
    * @param context ExecutionContext
    * @returns boolean
    */
   private isMetricsEndpoint(context: ExecutionContext): boolean {
      // Chỉ xử lý cho HTTP requests
      if (context.getType() !== 'http') {
         return false;
      }

      const request = context.switchToHttp().getRequest();
      const url = request.url;

      // Kiểm tra nếu URL chứa /metrics hoặc các endpoint liên quan đến monitoring
      const excludedPaths = ['/metrics', '/prometheus', '/monitoring'];

      return excludedPaths.some((path) => url.includes(path));
   }
}
