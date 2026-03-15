import { IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

export class QueryShopsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  search?: string;
}
