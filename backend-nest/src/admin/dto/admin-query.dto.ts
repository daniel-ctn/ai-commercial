import { IsOptional, IsString, IsBoolean, IsUUID, IsIn } from 'class-validator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

export const VALID_ROLES = ['user', 'shop_admin', 'admin'] as const;
export type UserRole = (typeof VALID_ROLES)[number];

export class AdminUsersQueryDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(VALID_ROLES)
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
  @IsIn(VALID_ROLES, { message: `role must be one of: ${VALID_ROLES.join(', ')}` })
  role: UserRole;
}
