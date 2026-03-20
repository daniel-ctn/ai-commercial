import { Transform, plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsString,
  IsOptional,
  IsNumber,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  UPSTASH_REDIS_URL: string;

  @IsString()
  @MinLength(16, { message: 'SECRET_KEY must be at least 16 characters' })
  SECRET_KEY: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsOptional()
  @IsString()
  APP_NAME?: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsNumber()
  PORT?: number;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsOptional()
  @IsIn(['lax', 'strict', 'none'])
  COOKIE_SAME_SITE?: 'lax' | 'strict' | 'none';

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  COOKIE_SECURE?: boolean;

  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsNumber()
  ACCESS_TOKEN_EXPIRE_MINUTES?: number;

  @IsOptional()
  @IsNumber()
  REFRESH_TOKEN_EXPIRE_DAYS?: number;

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.map((e) => Object.values(e.constraints ?? {}).join(', '));
    throw new Error(`Environment validation failed:\n  - ${messages.join('\n  - ')}`);
  }

  return validated;
}
