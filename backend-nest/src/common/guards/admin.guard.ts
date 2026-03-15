/**
 * Admin Guard — restricts access to admin-only routes
 *
 * Guards run AFTER the JWT auth guard, so request.user is already set.
 * This checks if the user's role is 'admin'.
 *
 * Usage: Stack guards — JWT first (are you logged in?), then Admin (are you admin?)
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 *   @Post('categories')
 *   createCategory() { ... }
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
