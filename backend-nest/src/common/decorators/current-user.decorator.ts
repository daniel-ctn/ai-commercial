/**
 * Custom Parameter Decorator — @CurrentUser()
 *
 * In Next.js, you'd get the current user via:
 *   const session = await getServerSession(authOptions)
 *   const user = session?.user
 *
 * In NestJS, the JWT guard attaches the user to `request.user`.
 * This decorator extracts it cleanly so controllers can write:
 *
 *   @Get('me')
 *   getProfile(@CurrentUser() user: User) { return user; }
 *
 * Instead of:
 *   getProfile(@Req() req: Request) { return req.user; }
 *
 * createParamDecorator is NestJS's way to create reusable parameter extractors.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
