import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { CompareService } from './compare.service';
import type { Product } from '../products/entities/product.entity';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-1',
    shop_id: 's-1',
    category_id: 'c-1',
    name: 'Test Product',
    description: 'A test product',
    price: 100,
    original_price: null,
    image_url: null,
    attributes: null,
    is_active: true,
    created_at: new Date(),
    search_vector: '',
    shop: { id: 's-1', name: 'Shop A' },
    category: { id: 'c-1', name: 'Laptops' },
    ...overrides,
  } as Product;
}

function createCompareService(products: Product[]) {
  const repo = {
    find: async () => products,
  };

  return new CompareService(repo as never);
}

test('compare returns products in the requested order with attribute_keys', async () => {
  const p1 = makeProduct({
    id: 'p-1',
    name: 'Laptop A',
    price: 999,
    attributes: { ram: '16GB', storage: '512GB' },
  });
  const p2 = makeProduct({
    id: 'p-2',
    name: 'Laptop B',
    price: 1299,
    attributes: { ram: '32GB', gpu: 'RTX 4060' },
    shop: { id: 's-2', name: 'Shop B' } as never,
  });

  const service = createCompareService([p2, p1]);
  const result = await service.compare(['p-1', 'p-2']);

  assert.equal(result.products.length, 2);
  assert.equal(result.products[0].name, 'Laptop A');
  assert.equal(result.products[1].name, 'Laptop B');
  assert.deepEqual(result.attribute_keys, ['gpu', 'ram', 'storage']);
});

test('compare deduplicates IDs', async () => {
  const p1 = makeProduct({ id: 'p-1' });
  const p2 = makeProduct({ id: 'p-2' });

  const service = createCompareService([p1, p2]);
  const result = await service.compare(['p-1', 'p-1', 'p-2']);

  assert.equal(result.products.length, 2);
});

test('compare throws when fewer than 2 active products are found', async () => {
  const p1 = makeProduct({ id: 'p-1' });
  const service = createCompareService([p1]);

  await assert.rejects(
    service.compare(['p-1', 'p-nonexistent']),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      return true;
    },
  );
});

test('compare marks on_sale correctly', async () => {
  const p1 = makeProduct({ id: 'p-1', price: 799, original_price: 999 });
  const p2 = makeProduct({ id: 'p-2', price: 500, original_price: null });

  const service = createCompareService([p1, p2]);
  const result = await service.compare(['p-1', 'p-2']);

  assert.equal(result.products[0].on_sale, true);
  assert.equal(result.products[1].on_sale, false);
});

test('compare returns empty attribute_keys when no products have attributes', async () => {
  const p1 = makeProduct({ id: 'p-1', attributes: null });
  const p2 = makeProduct({ id: 'p-2', attributes: null });

  const service = createCompareService([p1, p2]);
  const result = await service.compare(['p-1', 'p-2']);

  assert.deepEqual(result.attribute_keys, []);
});
