/**
 * Shared Pagination DTOs
 *
 * In Next.js, you'd parse searchParams manually or use Zod:
 *   const schema = z.object({ page: z.coerce.number().default(1) })
 *
 * In NestJS, DTOs with class-validator decorators do the same thing.
 * The `ValidationPipe` in main.ts auto-validates these when used
 * with @Query() in controllers.
 *
 * `transform: true` + `enableImplicitConversion: true` in the pipe
 * means query string "1" auto-converts to number 1.
 */
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class PaginationQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  page_size: number = 20;
}

export class PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;

  constructor(items: T[], total: number, page: number, pageSize: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.page_size = pageSize;
    this.pages = Math.ceil(total / pageSize);
  }
}
