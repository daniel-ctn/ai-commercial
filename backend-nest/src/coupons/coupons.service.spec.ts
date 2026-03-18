import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import type { Coupon } from './entities/coupon.entity';
import type { User } from '../users/entities/user.entity';

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'coupon-1',
    shop_id: 'shop-1',
    code: 'SAVE10',
    description: '10% off',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase: null,
    valid_from: new Date('2026-01-01'),
    valid_until: new Date('2026-12-31'),
    is_active: true,
    ...overrides,
  } as Coupon;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Owner',
    role: 'shop_admin',
    ...overrides,
  } as User;
}

function createCouponsService(options?: {
  coupons?: Coupon[];
  shopOwnerId?: string;
}) {
  const storedCoupons = options?.coupons ?? [makeCoupon()];
  let idCounter = storedCoupons.length;

  const qbResult = {
    items: storedCoupons,
    total: storedCoupons.length,
  };

  const qb = {
    andWhere: () => qb,
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () =>
      [qbResult.items, qbResult.total] as [Coupon[], number],
  };

  const couponsRepo = {
    createQueryBuilder: () => qb,
    findOne: async (opts: { where: { id: string } }) =>
      storedCoupons.find((c) => c.id === opts.where.id) ?? null,
    create: (data: Record<string, unknown>) => ({
      ...data,
      id: `coupon-${++idCounter}`,
    }),
    save: async (coupon: Coupon) => coupon,
    remove: async () => undefined,
  };

  const shopsRepo = {
    findOne: async () =>
      options?.shopOwnerId
        ? { id: 'shop-1', owner_id: options.shopOwnerId }
        : null,
  };

  const redis = {
    get: async () => null,
    set: async () => undefined,
    del: async () => undefined,
    incr: async () => 1,
  };

  return new CouponsService(
    couponsRepo as never,
    shopsRepo as never,
    redis as never,
  );
}

test('findById returns coupon when found', async () => {
  const coupon = makeCoupon({ id: 'c-1' });
  const service = createCouponsService({ coupons: [coupon] });

  const result = await service.findById('c-1');
  assert.equal(result.id, 'c-1');
  assert.equal(result.code, 'SAVE10');
});

test('findById throws NotFoundException when coupon does not exist', async () => {
  const service = createCouponsService({ coupons: [] });

  await assert.rejects(
    service.findById('nonexistent'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.equal(error.message, 'Coupon not found');
      return true;
    },
  );
});

test('create validates percentage discount cannot exceed 100', async () => {
  const service = createCouponsService({ shopOwnerId: 'user-1' });
  const user = makeUser({ id: 'user-1' });

  await assert.rejects(
    service.create(
      {
        shop_id: 'shop-1',
        code: 'HUGE',
        discount_type: 'percentage',
        discount_value: 150,
        valid_from: '2026-01-01T00:00:00Z',
        valid_until: '2026-12-31T00:00:00Z',
      } as never,
      user,
    ),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(error.message, /cannot exceed 100/);
      return true;
    },
  );
});

test('create validates valid_until must be after valid_from', async () => {
  const service = createCouponsService({ shopOwnerId: 'user-1' });
  const user = makeUser({ id: 'user-1' });

  await assert.rejects(
    service.create(
      {
        shop_id: 'shop-1',
        code: 'BACKWARDS',
        discount_type: 'fixed',
        discount_value: 10,
        valid_from: '2026-12-31T00:00:00Z',
        valid_until: '2026-01-01T00:00:00Z',
      } as never,
      user,
    ),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(error.message, /valid_until must be after/);
      return true;
    },
  );
});

test('create throws ForbiddenException when user does not own the shop', async () => {
  const service = createCouponsService({ shopOwnerId: 'other-user' });
  const user = makeUser({ id: 'user-1' });

  await assert.rejects(
    service.create(
      {
        shop_id: 'shop-1',
        code: 'NOPE',
        discount_type: 'fixed',
        discount_value: 5,
        valid_from: '2026-01-01T00:00:00Z',
        valid_until: '2026-12-31T00:00:00Z',
      } as never,
      user,
    ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.equal(error.message, 'You do not own this shop');
      return true;
    },
  );
});

test('create allows admin to create coupon for any shop', async () => {
  const service = createCouponsService({ shopOwnerId: 'other-user' });
  const admin = makeUser({ id: 'admin-1', role: 'admin' });

  const result = await service.create(
    {
      shop_id: 'shop-1',
      code: 'ADMIN',
      discount_type: 'fixed',
      discount_value: 5,
      valid_from: '2026-01-01T00:00:00Z',
      valid_until: '2026-12-31T00:00:00Z',
    } as never,
    admin,
  );

  assert.ok(result.id);
});
