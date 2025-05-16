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
}
