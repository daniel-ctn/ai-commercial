/**
 * JWT Auth Guard — protects routes that require authentication
 *
 * In Next.js, you protect routes with middleware.ts:
 *   if (!session) return NextResponse.redirect('/login')
 *
 * In NestJS, Guards serve the same purpose. Apply with @UseGuards(JwtAuthGuard):
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile() { ... }
 *
 * AuthGuard('jwt') triggers the JwtStrategy (defined separately),
 * which reads the JWT from the cookie, verifies it, and attaches
 * the user to request.user.
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
