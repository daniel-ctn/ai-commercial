import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { CompareController } from './compare.controller';
import { CompareService } from './compare.service';
import { CompareSummaryService } from './compare-summary.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [CompareController],
  providers: [CompareService, CompareSummaryService],
  exports: [CompareService],
})
export class CompareModule {}
