/**
 * Database Module — TypeORM + Neon PostgreSQL
 *
 * Like setting up Prisma or Drizzle in a Next.js project:
 *   - Prisma: you run `prisma generate` and import PrismaClient
 *   - TypeORM: you configure it here and NestJS injects repositories where needed
 *
 * TypeORM.forRootAsync uses ConfigService to read DATABASE_URL at runtime
 * (not at import time), which is safer for env-based configuration.
 *
 * `autoLoadEntities: true` automatically registers any entity used in
 * TypeOrmModule.forFeature() calls in other modules — no manual entity list needed.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        return {
          type: 'postgres' as const,
          url: config.getOrThrow<string>('DATABASE_URL'),
          ssl: { rejectUnauthorized: isProduction },
          autoLoadEntities: true,
          synchronize: false,
          logging: config.get('DEBUG') === 'true',
          extra: {
            max: config.get<number>('DB_POOL_MAX', 10),
            min: config.get<number>('DB_POOL_MIN', 2),
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
