/**
 * Root Module — like _app.tsx or root layout.tsx in Next.js
 *
 * In Next.js, your root layout wraps everything and provides global context.
 * In NestJS, AppModule is the root that imports all feature modules.
 *
 * @Module() decorator tells NestJS:
 *   - imports: other modules this module depends on (like importing providers in layout.tsx)
 *   - controllers: HTTP route handlers registered in this module
 *   - providers: services/utilities available for dependency injection
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ShopsModule } from './shops/shops.module';
import { ProductsModule } from './products/products.module';
import { CouponsModule } from './coupons/coupons.module';
import { CompareModule } from './compare/compare.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
      validate,
    }),

    // ThrottlerModule — rate limiting (60 requests per 60 seconds)
    // Protects against abuse; in Next.js you'd use middleware or a library like `rate-limiter-flexible`
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],
    }),

    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ShopsModule,
    ProductsModule,
    CouponsModule,
    CompareModule,
    ChatModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    // Apply rate limiting globally to all routes
    // APP_GUARD is a special NestJS token — like wrapping all routes in middleware.ts
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
