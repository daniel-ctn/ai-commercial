import { plainToInstance } from 'class-transformer';
import {
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
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsNumber()
  ACCESS_TOKEN_EXPIRE_MINUTES?: number;

  @IsOptional()
  @IsNumber()
  REFRESH_TOKEN_EXPIRE_DAYS?: number;
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
