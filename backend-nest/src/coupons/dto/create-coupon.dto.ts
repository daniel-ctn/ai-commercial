import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
  Max,
  MinLength,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAfterValidFrom', async: false })
class IsAfterValidFrom implements ValidatorConstraintInterface {
  validate(validUntil: string, args: ValidationArguments) {
    const obj = args.object as CreateCouponDto;
    return new Date(validUntil) > new Date(obj.valid_from);
  }
  defaultMessage() {
    return 'valid_until must be after valid_from';
  }
}

export class CreateCouponDto {
  @IsUUID()
  shop_id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsIn(['percentage', 'fixed'])
  discount_type: 'percentage' | 'fixed';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'discount_value must be greater than 0' })
  @Max(100, { message: 'discount_value cannot exceed 100 for percentage type' })
  discount_value: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  min_purchase?: number;

  @IsDateString()
  valid_from: string;

  @IsDateString()
  @Validate(IsAfterValidFrom)
  valid_until: string;
}
