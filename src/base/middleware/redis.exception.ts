import {HttpException, HttpStatus} from '@nestjs/common';

export class RedisException extends HttpException {
   constructor(message: string, code: number = -99) {
      super(
         {
            code,
            message: {
               vn: message,
               en: 'Cannot connect to Redis',
            },
         },
         HttpStatus.INTERNAL_SERVER_ERROR,
      );
   }
}
