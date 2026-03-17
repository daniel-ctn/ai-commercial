import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { User } from '../users/entities/user.entity';

type JwtPayload = {
  sub: string;
  type: 'access' | 'refresh';
  exp?: number;
};

type JwtVerifyOptions = {
  ignoreExpiration?: boolean;
};

function createAuthService() {
  const user = {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Owner',
    role: 'user',
    oauth_provider: null,
    oauth_id: null,
    password_hash: '$2b$12$hash',
    created_at: new Date(),
    shops: [],
  } as User;

  const payload: JwtPayload = {
    sub: user.id,
    type: 'refresh',
    exp: Math.floor(Date.now() / 1000) + 60,
  };

  let signCounter = 0;
  let reservationAttempts = 0;

  const usersService = {
    findByEmail: async (_email: string) => null,
    findById: async (id: string) => (id === user.id ? user : null),
    create: async () => user,
  };

  const jwtService = {
    sign: (tokenPayload: { type: 'access' | 'refresh' }) =>
      `${tokenPayload.type}-token-${++signCounter}`,
    verify: (_token: string, _options?: JwtVerifyOptions) => payload,
  };

  const config = {
    get: <T>(_key: string, defaultValue?: T): T | undefined => defaultValue,
  };

  const redis = {
    set: async () => undefined,
    exists: async () => false,
    setIfAbsent: async () => {
      reservationAttempts += 1;
      return reservationAttempts === 1;
    },
  };

  return {
    user,
    getReservationAttempts: () => reservationAttempts,
    service: new AuthService(
      usersService as never,
      jwtService as never,
      config as never,
      redis as never,
    ),
  };
}

test('refreshTokens blacklists a refresh token on first use and rejects replays', async () => {
  const { service, user, getReservationAttempts } = createAuthService();

  const firstRefresh = await service.refreshTokens('refresh-token');

  assert.equal(firstRefresh.user, user);
  assert.match(firstRefresh.tokens.accessToken, /^access-token-/);
  assert.match(firstRefresh.tokens.refreshToken, /^refresh-token-/);

  await assert.rejects(
    service.refreshTokens('refresh-token'),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      assert.equal(error.message, 'Invalid refresh token');
      return true;
    },
  );

  assert.equal(getReservationAttempts(), 2);
});
