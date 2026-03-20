import { IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @IsOptional()
  @IsString()
  shipping_name?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;
}
