/**
 * NestJS Entry Point — like a custom Next.js server.ts
 *
 * In Next.js, `next start` boots the server for you.
 * In NestJS, YOU create the server explicitly with NestFactory.
 * This gives you full control over middleware, CORS, pipes, etc.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Global prefix — every route starts with /api/v1
  // Like setting `basePath` in next.config.ts
  app.setGlobalPrefix('api/v1');

  // CORS — same concept as Next.js headers() config
  // Allows the frontend (different port) to make requests
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true, // Required for cookies to work cross-origin
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Cookie parser — reads httpOnly cookies from requests
  // In Next.js you'd use `cookies()` from next/headers
  app.use(cookieParser());

  // Global ValidationPipe — automatically validates all incoming DTOs
  // Like having Zod .parse() on every API route automatically
  // `whitelist: true` strips any properties not in the DTO (security)
  // `transform: true` auto-converts query string types (e.g., "1" → 1)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>('PORT', 8000);
  await app.listen(port);
  console.log(`NestJS server running on http://localhost:${port}`);
  console.log(`API docs: http://localhost:${port}/api/v1`);
}

bootstrap();
