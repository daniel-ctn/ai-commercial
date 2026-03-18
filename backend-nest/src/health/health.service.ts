import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
      app: this.config.get('APP_NAME', 'AI Commercial'),
      backend: 'nestjs',
    };
  }

  async getReadiness() {
    const checks: Record<string, string> = {};

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'ok';
    } catch (error) {
      checks.database = this.formatError(error);
    }

    try {
      await this.redis.ping();
      checks.redis = 'ok';
    } catch (error) {
      checks.redis = this.formatError(error);
    }

    const allOk = Object.values(checks).every((value) => value === 'ok');
    return {
      status: allOk ? 'ok' : 'degraded',
      checks,
      features: this.getFeatures(),
    };
  }

  getFeatures() {
    return {
      auth: true,
      google_oauth: !!this.config.get('GOOGLE_CLIENT_ID'),
      chat: !!this.config.get('GEMINI_API_KEY'),
      products: true,
      shops: true,
      coupons: true,
      compare: true,
      admin: true,
      full_text_search: true,
    };
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? `error: ${error.message}` : 'error: unknown';
  }
}
