import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ErrorTrackerService } from './error-tracker.service';

@Global()
@Module({
  providers: [MetricsService, ErrorTrackerService],
  exports: [MetricsService, ErrorTrackerService],
})
export class MetricsModule {}
