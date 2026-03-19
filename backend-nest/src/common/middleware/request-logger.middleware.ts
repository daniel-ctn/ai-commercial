import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { MetricsService } from '../metrics/metrics.service';

type RequestWithId = Request & { requestId?: string };

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics: MetricsService) {}

  use(req: RequestWithId, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    const requestId = (typeof incoming === 'string' ? incoming : null) ?? randomUUID().slice(0, 8);
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const route = `${req.method} ${req.baseUrl || ''}${req.route?.path ?? req.originalUrl.split('?')[0]}`;
      this.metrics.recordLatency(route, elapsedMs);

      if (res.statusCode === 401 || res.statusCode === 403) {
        this.metrics.increment('auth_failures');
      }

      const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(0)}ms [${requestId}]`;

      if (res.statusCode >= 500) {
        this.logger.error(message);
      } else if (res.statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
