import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { HealthService } from './health.service';
import { MetricsService } from '../common/metrics/metrics.service';
import { ErrorTrackerService } from '../common/metrics/error-tracker.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly healthService: HealthService,
    private readonly metrics: MetricsService,
    private readonly errorTracker: ErrorTrackerService,
  ) {}

  @Get()
  getHealth() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  async getReadiness(@Res({ passthrough: true }) res: Response) {
    const readiness = await this.healthService.getReadiness();

    if (readiness.status !== 'ok') {
      res.status(503);
    }

    return readiness;
  }

  @Get('features')
  getFeatures() {
    return this.healthService.getFeatures();
  }

  @Get('metrics')
  getMetrics() {
    return this.metrics.getSnapshot();
  }

  @Get('errors')
  getErrors(@Query('limit') limit?: string | number) {
    const normalizedLimit = Math.min(Math.max(Number(limit ?? 20) || 20, 1), 100);
    const includeSensitive = this.config.get('NODE_ENV', 'development') !== 'production';
    return {
      total: this.errorTracker.getCount(),
      errors: this.errorTracker.getRecent(normalizedLimit, includeSensitive),
    };
  }
}
