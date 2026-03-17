import { IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

export class AdminUsersQueryDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class AdminShopsQueryDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class AdminProductsQueryDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID()
  shop_id?: string;
}

export class AdminCouponsQueryDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID()
  shop_id?: string;
}

export class UpdateUserRoleDto {
  @IsString()
  role: string;
}
