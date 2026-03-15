/**
 * Auth Service — handles registration, login, token management
 *
 * In Next.js with NextAuth, most of this is handled by the library.
 * Here we implement it manually to understand what happens under the hood:
 *   1. Hash passwords with bcrypt (same as bcryptjs in Node)
 *   2. Create JWT tokens with @nestjs/jwt (same concept as jose in Next.js)
 *   3. Store blacklisted tokens in Redis (for logout)
 *
 * @Injectable() makes this available for dependency injection.
 * The AuthController will receive this via constructor injection:
 *   constructor(private authService: AuthService) {}
 */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.usersService.create({
      email: dto.email,
      password_hash: passwordHash,
      name: dto.name,
    });
  }

  async login(dto: LoginDto): Promise<User> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  createTokens(user: User) {
    const payload = { sub: user.id };

    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' },
      {
        expiresIn: `${this.config.get('ACCESS_TOKEN_EXPIRE_MINUTES', 30)}m`,
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        expiresIn: `${this.config.get('REFRESH_TOKEN_EXPIRE_DAYS', 7)}d`,
      },
    );

    return { accessToken, refreshToken };
  }

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`blacklist:${token}`, '1', ttlSeconds);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException();
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException();
      }

      return { user, tokens: this.createTokens(user) };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getOrCreateOAuthUser(
    email: string,
    name: string,
    provider: string,
    oauthId: string,
  ): Promise<User> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return existing;
    }

    return this.usersService.create({
      email,
      name,
      oauth_provider: provider,
      oauth_id: oauthId,
    });
  }
}
