import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  private readonly startedAt = new Date();

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
      uptime_seconds: Math.round((Date.now() - this.startedAt.getTime()) / 1000),
      started_at: this.startedAt.toISOString(),
    };
  }

  async getReadiness() {
    const checks: Record<string, string | object> = {};

    const dbStart = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      checks.database = { status: 'ok', latency_ms: Date.now() - dbStart };
    } catch (error) {
      checks.database = { status: this.formatError(error), latency_ms: Date.now() - dbStart };
    }

    const redisStart = Date.now();
    try {
      await this.redis.ping();
      checks.redis = { status: 'ok', latency_ms: Date.now() - redisStart };
    } catch (error) {
      checks.redis = { status: this.formatError(error), latency_ms: Date.now() - redisStart };
    }

    const geminiKey = this.config.get('GEMINI_API_KEY');
    checks.ai_provider = {
      status: geminiKey ? 'configured' : 'not_configured',
      provider: 'google_gemini',
    };

    const allOk = Object.values(checks).every((v) => {
      if (typeof v === 'object' && v !== null && 'status' in v) {
        const s = (v as { status: string }).status;
        return s === 'ok' || s === 'configured';
      }
      return v === 'ok';
    });

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
