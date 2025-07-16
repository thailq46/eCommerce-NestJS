// prometheus.middleware.ts
import {Injectable, NestMiddleware} from '@nestjs/common';
import {NextFunction, Request, Response} from 'express';
import {Histogram} from 'prom-client';

const httpRequestDurationMicroseconds = new Histogram({
   name: 'http_request_duration_seconds',
   help: 'Duration of HTTP requests in seconds',
   labelNames: ['method', 'route', 'code'],
   buckets: [0.1, 0.5, 1, 1.5, 2, 5], // tùy chỉnh theo app
});

@Injectable()
export class PrometheusMiddleware implements NestMiddleware {
   use(req: Request, res: Response, next: NextFunction) {
      const end = httpRequestDurationMicroseconds.startTimer();
      res.on('finish', () => {
         const route = req.route?.path || req.path; // path: /api/v1/spu/info/:id
         end({route, method: req.method, code: res.statusCode});
      });
      next();
   }
}
