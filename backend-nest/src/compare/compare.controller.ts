import { Controller, Get, Query } from '@nestjs/common';
import { CompareService } from './compare.service';
import { CompareSummaryService } from './compare-summary.service';
import { QueryCompareDto } from './dto/query-compare.dto';

@Controller('compare')
export class CompareController {
  constructor(
    private readonly compareService: CompareService,
    private readonly summaryService: CompareSummaryService,
  ) {}

  @Get()
  compare(@Query() query: QueryCompareDto) {
    return this.compareService.compare(query.ids);
  }

  @Get('summary')
  async summary(@Query() query: QueryCompareDto) {
    return this.summaryService.generateSummary(query.ids);
  }
}
