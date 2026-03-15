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
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        // synchronize: false — NEVER true in production!
        // Use migrations instead (like prisma migrate)
        synchronize: false,
        logging: config.get('DEBUG') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}
