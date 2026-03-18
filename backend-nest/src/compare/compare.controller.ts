import { Controller, Get, Query } from '@nestjs/common';
import { CompareService } from './compare.service';
import { QueryCompareDto } from './dto/query-compare.dto';

@Controller('compare')
export class CompareController {
  constructor(private readonly compareService: CompareService) {}

  @Get()
  compare(@Query() query: QueryCompareDto) {
    return this.compareService.compare(query.ids);
  }
}
