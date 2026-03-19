import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorTrackerService } from '../metrics/error-tracker.service';

type RequestWithId = Request & { requestId?: string };

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly errorTracker: ErrorTrackerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
      } else {
        const msg = (body as { message?: string | string[] }).message;
        if (Array.isArray(msg)) {
          detail = msg.join(', ');
        } else if (typeof msg === 'string') {
          detail = msg;
        }
      }
    }

    const requestId = request.requestId ?? 'unknown';

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url} [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );

      this.errorTracker.capture({
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        status,
        message: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
        requestId,
      });
    }

    response.status(status).json({ detail, ...(requestId ? { request_id: requestId } : {}) });
  }
}
