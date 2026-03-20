import { IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number = 1;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ApplyCouponDto {
  @IsString()
  code: string;
}
