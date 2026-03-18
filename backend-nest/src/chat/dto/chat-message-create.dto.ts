import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChatMessageCreateDto {
  @IsString()
  @MinLength(1, { message: 'Message must not be empty' })
  @MaxLength(2000, { message: 'Message must be at most 2000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content: string;
}
