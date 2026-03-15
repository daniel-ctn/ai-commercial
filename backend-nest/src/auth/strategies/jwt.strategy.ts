/**
 * JWT Strategy — tells Passport HOW to validate JWTs
 *
 * Passport uses a "strategy" pattern — each auth method (JWT, Google, GitHub)
 * is a separate strategy. Think of it like middleware that runs before your handler.
 *
 * This strategy:
 * 1. Extracts the JWT from the `access_token` cookie (not Authorization header)
 * 2. Verifies the signature using SECRET_KEY
 * 3. Calls `validate()` with the decoded payload
 * 4. Whatever `validate()` returns gets attached to `request.user`
 *
 * In Next.js auth (NextAuth/Auth.js), the session callback does something similar —
 * it takes the JWT payload and returns the session user object.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly redis: RedisService,
  ) {
    super({
      // Extract JWT from httpOnly cookie (not the Authorization header)
      jwtFromRequest: (req: Request) => req?.cookies?.['access_token'] ?? null,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('SECRET_KEY'),
      passReqToCallback: true,
    });
  }

  /**
   * Called after JWT signature is verified.
   * `payload` is the decoded JWT: { sub: 'user-uuid', type: 'access', exp: ... }
   * Return value gets attached to request.user
   */
  async validate(req: Request, payload: { sub: string; type: string }) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }

    // Check if token has been blacklisted (user logged out)
    const token = req.cookies?.['access_token'];
    if (token) {
      const isBlacklisted = await this.redis.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedException();
      }
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
