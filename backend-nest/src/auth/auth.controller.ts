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
  BadRequestException,
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type CookieOptions, Response, Request } from 'express';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleCallbackDto } from './dto/google-callback.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private getBaseCookieOptions(): CookieOptions {
    const isProduction = this.config.get('NODE_ENV') === 'production';
    const sameSite = this.config.get<'lax' | 'strict' | 'none'>(
      'COOKIE_SAME_SITE',
      'lax',
    );
    const secure =
      (this.config.get<boolean>('COOKIE_SECURE') ?? isProduction) || sameSite === 'none';
    const domain = this.config.get<string>('COOKIE_DOMAIN');

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const baseCookieOptions = this.getBaseCookieOptions();

    res.cookie('access_token', accessToken, {
      ...baseCookieOptions,
      maxAge: this.config.get('ACCESS_TOKEN_EXPIRE_MINUTES', 30) * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      ...baseCookieOptions,
      maxAge: this.config.get('REFRESH_TOKEN_EXPIRE_DAYS', 7) * 24 * 60 * 60 * 1000,
    });
  }

  private setOAuthStateCookie(res: Response, state: string) {
    res.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.getBaseCookieOptions(),
      maxAge: OAUTH_STATE_TTL_MS,
    });
  }

  private clearOAuthStateCookie(res: Response) {
    res.clearCookie(OAUTH_STATE_COOKIE, this.getBaseCookieOptions());
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

    await Promise.all([
      accessToken ? this.authService.revokeToken(accessToken) : Promise.resolve(),
      refreshToken ? this.authService.revokeToken(refreshToken) : Promise.resolve(),
    ]);

    const cookieOptions = this.getBaseCookieOptions();
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    this.clearOAuthStateCookie(res);
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
  getGoogleUrl(@Res({ passthrough: true }) res: Response) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new NotImplementedException('Google OAuth not configured');
    }

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const state = randomBytes(32).toString('hex');
    this.setOAuthStateCookie(res, state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${frontendUrl}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      state,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return { url };
  }

  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Body() dto: GoogleCallbackDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET');
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];

    this.clearOAuthStateCookie(res);

    if (!clientId || !clientSecret) {
      throw new NotImplementedException('Google OAuth not configured');
    }
    if (!expectedState || expectedState !== dto.state) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    // Exchange code for tokens with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        code: dto.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${frontendUrl}/auth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException('Google OAuth failed');
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new BadRequestException('Google did not return an access token');
    }

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
      googleUser.name ?? googleUser.email,
      'google',
      googleUser.id,
    );

    const tokens = this.authService.createTokens(user);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return this.toUserResponse(user);
  }
}
