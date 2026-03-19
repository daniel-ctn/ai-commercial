import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import type { Product } from '../products/entities/product.entity';
import type { Coupon } from '../coupons/entities/coupon.entity';
import type { Category } from '../categories/entities/category.entity';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    shop_id: 'shop-1',
    category_id: 'category-1',
    name: 'Product',
    description: 'Description',
    price: 99,
    original_price: null,
    image_url: null,
    attributes: null,
    is_active: true,
    created_at: new Date('2026-03-19T00:00:00Z'),
    search_vector: '',
    shop: { id: 'shop-1', name: 'Shop 1' },
    category: { id: 'category-1', name: 'Category 1', slug: 'category-1' },
    ...overrides,
  } as Product;
}

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'coupon-1',
    shop_id: 'shop-1',
    code: 'SAVE10',
    description: 'Discount',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase: null,
    valid_from: new Date('2026-03-19T00:00:00Z'),
    valid_until: new Date('2026-03-29T00:00:00Z'),
    is_active: true,
    shop: { id: 'shop-1', name: 'Shop 1' },
    ...overrides,
  } as Coupon;
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'category-1',
    name: 'Category 1',
    slug: 'category-1',
    parent_id: null,
    parent: null,
    children: [],
    products: [],
    ...overrides,
  } as Category;
}

function createUpdateBuilder<T extends { id: string; shop_id?: string }>(
  records: T[],
) {
  let ids: string[] = [];
  let shopId: string | null = null;
  let values: Partial<T> = {};

  const builder = {
    update: () => builder,
    set: (nextValues: Partial<T>) => {
      values = nextValues;
      return builder;
    },
    whereInIds: (nextIds: string[]) => {
      ids = nextIds;
      return builder;
    },
    andWhere: (_clause: string, params: { shopId: string }) => {
      shopId = params.shopId;
      return builder;
    },
    execute: async () => {
      let affected = 0;
      for (const record of records) {
        if (!ids.includes(record.id)) {
          continue;
        }
        if (shopId && record.shop_id !== shopId) {
          continue;
        }
        Object.assign(record, values);
        affected += 1;
      }
      return { affected };
    },
  };

  return builder;
}

function createAdminService() {
  const products = [
    makeProduct(),
    makeProduct({ id: 'product-2', shop_id: 'shop-2', shop: { id: 'shop-2', name: 'Shop 2' } }),
  ];
  const coupons = [
    makeCoupon(),
    makeCoupon({ id: 'coupon-2', shop_id: 'shop-2', shop: { id: 'shop-2', name: 'Shop 2' } }),
  ];
  const categories = [
    makeCategory(),
    makeCategory({ id: 'category-2', name: 'Category 2', slug: 'category-2' }),
  ];

  const productsRepo = {
    findOne: async (opts: { where: { id: string } }) =>
      products.find((product) => product.id === opts.where.id) ?? null,
    save: async (product: Product) => product,
    createQueryBuilder: () => createUpdateBuilder(products),
  };

  const couponsRepo = {
    findOne: async (opts: { where: { id: string } }) =>
      coupons.find((coupon) => coupon.id === opts.where.id) ?? null,
    save: async (coupon: Coupon) => coupon,
    createQueryBuilder: () => createUpdateBuilder(coupons),
  };

  const categoriesRepo = {
    findOne: async (opts: { where: { id: string } }) =>
      categories.find((category) => category.id === opts.where.id) ?? null,
  };

  const service = new AdminService(
    {} as never,
    {} as never,
    productsRepo as never,
    couponsRepo as never,
    categoriesRepo as never,
  );

  return {
    service,
    products,
    coupons,
  };
}

test('toggleProductActiveForShop rejects products from another shop without mutating them', async () => {
  const { service, products } = createAdminService();

  await assert.rejects(
    service.toggleProductActiveForShop('product-2', 'shop-1'),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.equal(error.message, 'Product does not belong to your shop');
      return true;
    },
  );

  assert.equal(products[1]?.is_active, true);
});

test('toggleCouponActiveForShop rejects coupons from another shop without mutating them', async () => {
  const { service, coupons } = createAdminService();

  await assert.rejects(
    service.toggleCouponActiveForShop('coupon-2', 'shop-1'),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.equal(error.message, 'Coupon does not belong to your shop');
      return true;
    },
  );

  assert.equal(coupons[1]?.is_active, true);
});

test('bulkToggleProductsForShop only updates products that belong to the owned shop', async () => {
  const { service, products } = createAdminService();

  const result = await service.bulkToggleProductsForShop(
    ['product-1', 'product-2'],
    false,
    'shop-1',
  );

  assert.equal(result.affected, 1);
  assert.equal(products[0]?.is_active, false);
  assert.equal(products[1]?.is_active, true);
});

test('bulkAssignCategoryForShop only reassigns products that belong to the owned shop', async () => {
  const { service, products } = createAdminService();

  const result = await service.bulkAssignCategoryForShop(
    ['product-1', 'product-2'],
    'category-2',
    'shop-1',
  );

  assert.equal(result.affected, 1);
  assert.equal(products[0]?.category_id, 'category-2');
  assert.equal(products[1]?.category_id, 'category-1');
});

test('bulkAssignCategoryForShop rejects unknown categories before updating products', async () => {
  const { service, products } = createAdminService();

  await assert.rejects(
    service.bulkAssignCategoryForShop(['product-1'], 'missing-category', 'shop-1'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.equal(error.message, 'Category not found');
      return true;
    },
  );

  assert.equal(products[0]?.category_id, 'category-1');
});
