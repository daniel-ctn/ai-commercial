import { IsOptional, IsString, IsUUID, IsNumber, IsBoolean, IsIn, Min } from 'class-validator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

export class QueryProductsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  search?: string;

  /** Accepts category slug or UUID */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  shop_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_price?: number;

  @IsOptional()
  @IsBoolean()
  on_sale?: boolean;

  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc', 'discount', 'best_value'])
  sort?: string;
}
