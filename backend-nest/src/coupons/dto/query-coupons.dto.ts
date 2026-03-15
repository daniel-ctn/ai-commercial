import { IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

export class QueryCouponsDto extends PaginationQuery {
  @IsOptional()
  @IsUUID()
  shop_id?: string;

  @IsOptional()
  @IsBoolean()
  active_only?: boolean = true;
}
