import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

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
}
