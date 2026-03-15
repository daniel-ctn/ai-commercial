import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCouponDto {
  @IsUUID()
  shop_id: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['percentage', 'fixed'])
  discount_type: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount_value: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  min_purchase?: number;

  @IsDateString()
  valid_from: string;

  @IsDateString()
  valid_until: string;
}
