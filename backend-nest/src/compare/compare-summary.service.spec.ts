import assert from 'node:assert/strict';
import test from 'node:test';
import { CompareSummaryService } from './compare-summary.service';
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

function createService({
  apiKey,
  products = [],
}: {
  apiKey?: string;
  products?: Product[];
}) {
  const config = {
    get: (key: string) => (key === 'GEMINI_API_KEY' ? apiKey : undefined),
  };

  const repo = {
    find: async () => products,
  };

  return new CompareSummaryService(config as never, repo as never);
}

test('generateSummary returns a helpful message when AI is not configured', async () => {
  const service = createService({ products: [makeProduct({ id: 'p-1' }), makeProduct({ id: 'p-2' })] });

  const result = await service.generateSummary(['p-1', 'p-2']);

  assert.equal(
    result.summary,
    'AI summary is not available. Set GEMINI_API_KEY to enable this feature.',
  );
});

test('generateSummary returns a fallback when fewer than 2 products are found', async () => {
  const service = createService({
    apiKey: 'test-key',
    products: [makeProduct({ id: 'p-1' })],
  });

  const result = await service.generateSummary(['p-1', 'missing']);

  assert.equal(result.summary, 'Could not find enough products to compare.');
});

test('generateSummary preserves requested order and returns model text', async () => {
  const p1 = makeProduct({ id: 'p-1', name: 'Laptop A', price: 999 });
  const p2 = makeProduct({ id: 'p-2', name: 'Laptop B', price: 1299 });
  const service = createService({
    apiKey: 'test-key',
    products: [p2, p1],
  });

  let capturedPrompt = '';
  (service as unknown as {
    client: {
      models: {
        generateContent: (args: { contents: string }) => Promise<{ text?: string }>;
      };
    };
  }).client = {
    models: {
      generateContent: async ({ contents }) => {
        capturedPrompt = contents;
        return { text: 'Short AI summary' };
      },
    },
  };

  const result = await service.generateSummary(['p-1', 'p-2']);

  assert.equal(result.summary, 'Short AI summary');
  assert.match(capturedPrompt, /Product 1: Laptop A/);
  assert.match(capturedPrompt, /Product 2: Laptop B/);
});

test('generateSummary falls back gracefully when the provider throws', async () => {
  const service = createService({
    apiKey: 'test-key',
    products: [makeProduct({ id: 'p-1' }), makeProduct({ id: 'p-2' })],
  });
  (service as unknown as { logger: { error: () => void } }).logger.error = () => {};

  (service as unknown as {
    client: {
      models: {
        generateContent: () => Promise<never>;
      };
    };
  }).client = {
    models: {
      generateContent: async () => {
        throw new Error('boom');
      },
    },
  };

  const result = await service.generateSummary(['p-1', 'p-2']);

  assert.equal(result.summary, 'AI summary temporarily unavailable. Please try again later.');
});
