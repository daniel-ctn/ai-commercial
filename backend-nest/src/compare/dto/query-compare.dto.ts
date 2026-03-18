import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Query DTO for product comparison.
 *
 * Accepts `?ids=uuid1&ids=uuid2` (repeated query params).
 * NestJS + class-transformer converts the string values to an array.
 * `@Transform` handles the case where a single value comes in as a string
 * instead of an array.
 */
export class QueryCompareDto {
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayMinSize(2, { message: 'Need at least 2 products to compare' })
  @ArrayMaxSize(5, { message: 'Can compare at most 5 products' })
  @IsUUID('4', { each: true })
  ids: string[];
}
