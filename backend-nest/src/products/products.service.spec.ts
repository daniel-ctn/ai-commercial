import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { Product } from './entities/product.entity';
import type { User } from '../users/entities/user.entity';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    shop_id: 'shop-1',
    category_id: 'cat-1',
    name: 'Test Product',
    description: 'Description',
    price: 100,
    original_price: null,
    image_url: null,
    attributes: null,
    is_active: true,
    created_at: new Date(),
    search_vector: '',
    shop: { id: 'shop-1', name: 'Shop A', owner_id: 'user-1' },
    category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    ...overrides,
  } as Product;
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

function createProductsService(options?: {
  products?: Product[];
  shopOwnerId?: string;
}) {
  const storedProducts = options?.products ?? [makeProduct()];

  const qb = {
    leftJoinAndSelect: () => qb,
    where: () => qb,
    andWhere: () => qb,
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () =>
      [storedProducts, storedProducts.length] as [Product[], number],
  };

  const productsRepo = {
    createQueryBuilder: () => qb,
    findOne: async (opts: { where: { id: string } }) =>
      storedProducts.find((p) => p.id === opts.where.id) ?? null,
    create: (data: Record<string, unknown>) => ({ ...data, id: 'new-prod' }),
    save: async (product: Product) => product,
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

  return new ProductsService(
    productsRepo as never,
    shopsRepo as never,
    redis as never,
  );
}

test('findAll returns paginated products', async () => {
  const products = [
    makeProduct({ id: 'p-1', name: 'Laptop' }),
    makeProduct({ id: 'p-2', name: 'Phone' }),
  ];
  const service = createProductsService({ products });

  const result = await service.findAll({ page: 1, page_size: 20 } as never);

  assert.equal(result.items.length, 2);
  assert.equal(result.total, 2);
  assert.equal(result.page, 1);
});

test('findById returns a product when found', async () => {
  const product = makeProduct({ id: 'p-1', name: 'Laptop' });
  const service = createProductsService({ products: [product] });

  const result = await service.findById('p-1');
  assert.equal(result.name, 'Laptop');
});

test('findById throws NotFoundException when product does not exist', async () => {
  const service = createProductsService({ products: [] });

  await assert.rejects(
    service.findById('nonexistent'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.equal(error.message, 'Product not found');
      return true;
    },
  );
});

test('remove throws ForbiddenException when user does not own the shop', async () => {
  const product = makeProduct({ id: 'p-1', shop_id: 'shop-1' });
  const service = createProductsService({
    products: [product],
    shopOwnerId: 'other-user',
  });
  const user = makeUser({ id: 'user-1' });

  await assert.rejects(
    service.remove('p-1', user),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.equal(error.message, 'You do not own this shop');
      return true;
    },
  );
});

test('remove allows admin to delete any product', async () => {
  const product = makeProduct({ id: 'p-1', shop_id: 'shop-1' });
  const service = createProductsService({
    products: [product],
    shopOwnerId: 'other-user',
  });
  const admin = makeUser({ id: 'admin-1', role: 'admin' });

  await assert.doesNotReject(service.remove('p-1', admin));
});

test('remove throws NotFoundException when product does not exist', async () => {
  const service = createProductsService({
    products: [],
    shopOwnerId: 'user-1',
  });
  const user = makeUser({ id: 'user-1' });

  await assert.rejects(
    service.remove('nonexistent', user),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    },
  );
});
