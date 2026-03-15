/**
 * PartialType takes CreateShopDto and makes every field optional.
 * Like TypeScript's Partial<T> but also carries over validation decorators.
 * Equivalent to Zod's `.partial()`.
 */
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateShopDto } from './create-shop.dto';

export class UpdateShopDto extends PartialType(CreateShopDto) {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
