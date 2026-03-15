import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateCouponDto } from './create-coupon.dto';

export class UpdateCouponDto extends PartialType(
  OmitType(CreateCouponDto, ['shop_id'] as const),
) {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
