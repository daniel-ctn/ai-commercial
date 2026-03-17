/**
 * Auth Controller — handles HTTP requests for authentication
 *
 * In Next.js, this would be your app/api/auth/[...nextauth]/route.ts
 * or individual route handlers in app/api/auth/*.
 *
 * In NestJS, a Controller is a class with decorated methods:
 *   @Controller('auth')  → base path: /api/v1/auth
 *   @Post('login')       → POST /api/v1/auth/login
 *   @Get('me')           → GET /api/v1/auth/me
 *
 * The controller is thin — it handles HTTP concerns (cookies, status codes)
 * and delegates business logic to AuthService.
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleCallbackDto } from './dto/google-callback.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = this.config.get('NODE_ENV') === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: this.config.get('ACCESS_TOKEN_EXPIRE_MINUTES', 30) * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: this.config.get('REFRESH_TOKEN_EXPIRE_DAYS', 7) * 24 * 60 * 60 * 1000,
    });
  }

  private toUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      oauth_provider: user.oauth_provider,
      created_at: user.created_at,
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(dto);
    const tokens = this.authService.createTokens(user);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return this.toUserResponse(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.login(dto);
    const tokens = this.authService.createTokens(user);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return this.toUserResponse(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = req.cookies?.['access_token'];
    const refreshToken = req.cookies?.['refresh_token'];

    if (accessToken) {
      const expireMinutes = this.config.get('ACCESS_TOKEN_EXPIRE_MINUTES', 30);
      await this.authService.blacklistToken(accessToken, expireMinutes * 60);
    }
    if (refreshToken) {
      const expireDays = this.config.get('REFRESH_TOKEN_EXPIRE_DAYS', 7);
      await this.authService.blacklistToken(refreshToken, expireDays * 24 * 3600);
    }

    const isProduction = this.config.get('NODE_ENV') === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
    };
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { user, tokens } = await this.authService.refreshTokens(refreshToken);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return this.toUserResponse(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    return this.toUserResponse(user);
  }

  @Get('google')
  getGoogleUrl() {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    if (!clientId) {
      return { detail: 'Google OAuth not configured' };
    }

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const redirectUri = `${frontendUrl}/auth/google/callback`;
    const scope = encodeURIComponent('openid email profile');
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&redirect_uri=${redirectUri}` +
      `&response_type=code&scope=${scope}&access_type=offline`;

    return { url };
  }

  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Body() dto: GoogleCallbackDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET');
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    // Exchange code for tokens with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: dto.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${frontendUrl}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException('Google OAuth failed');
    }

    const tokenData = await tokenRes.json();

    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (!userInfoRes.ok) {
      throw new UnauthorizedException('Failed to get Google user info');
    }

    const googleUser = await userInfoRes.json();
    const user = await this.authService.getOrCreateOAuthUser(
      googleUser.email,
      googleUser.name,
      'google',
      googleUser.id,
    );

    const tokens = this.authService.createTokens(user);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return this.toUserResponse(user);
  }
}
