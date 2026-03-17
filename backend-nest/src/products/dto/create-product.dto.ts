import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsUrl,
  IsObject,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  shop_id: string;

  @IsUUID()
  category_id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  original_price?: number;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  image_url?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
