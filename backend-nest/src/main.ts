/**
 * NestJS Entry Point — like a custom Next.js server.ts
 *
 * In Next.js, `next start` boots the server for you.
 * In NestJS, YOU create the server explicitly with NestFactory.
 * This gives you full control over middleware, CORS, pipes, etc.
 */
import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ForbiddenException,
  HttpStatus,
  Logger,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendOrigins = config
    .get<string>('FRONTEND_URL', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set(frontendOrigins);

  app.enableShutdownHooks();
  app.use(helmet());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Global prefix — every route starts with /api/v1
  // Like setting `basePath` in next.config.ts
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
      { path: 'health/features', method: RequestMethod.GET },
    ],
  });

  // CORS — same concept as Next.js headers() config
  // Allows the frontend (different port) to make requests
  app.enableCors({
    origin: frontendOrigins,
    credentials: true, // Required for cookies to work cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Cookie parser — reads httpOnly cookies from requests
  // In Next.js you'd use `cookies()` from next/headers
  app.use(cookieParser());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const originHeader = req.headers.origin ?? req.headers.referer;
    const candidate = Array.isArray(originHeader) ? originHeader[0] : originHeader;
    if (!candidate) {
      return next();
    }

    try {
      const candidateOrigin = new URL(candidate).origin;
      if (allowedOrigins.has(candidateOrigin)) {
        return next();
      }
    } catch {
      return next(new ForbiddenException('Invalid request origin'));
    }

    return next(new ForbiddenException('Invalid request origin'));
  });

  // Global ValidationPipe — automatically validates all incoming DTOs
  // Like having Zod .parse() on every API route automatically
  // `whitelist: true` strips any properties not in the DTO (security)
  // `transform: true` auto-converts query string types (e.g., "1" → 1)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  const port = config.get<number>('PORT', 8000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`API prefix: http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.fatal('Failed to start application', err);
  process.exit(1);
});
