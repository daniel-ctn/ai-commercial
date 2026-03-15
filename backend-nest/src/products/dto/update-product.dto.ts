import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

// OmitType removes shop_id (can't change which shop owns a product)
// PartialType makes everything else optional
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['shop_id'] as const),
) {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
