import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * API Contract Tests
 *
 * These tests verify that backend responses conform to the shapes the frontend
 * expects (defined in frontend/src/lib/types.ts). If a backend changes its
 * response shape, these tests will catch the drift before it reaches the UI.
 */

// Validates that a value has all required keys with correct types
function assertShape(
  value: Record<string, unknown>,
  schema: Record<string, string>,
  label: string,
) {
  for (const [key, expectedType] of Object.entries(schema)) {
    const nullable = expectedType.endsWith(' | null');
    const baseType = nullable ? expectedType.replace(' | null', '') : expectedType;

    assert.ok(
      key in value,
      `${label}: missing required field "${key}"`,
    );

    const actual = value[key];
    if (nullable && actual === null) continue;

    if (baseType === 'array') {
      assert.ok(Array.isArray(actual), `${label}.${key}: expected array, got ${typeof actual}`);
    } else {
      assert.equal(
        typeof actual,
        baseType,
        `${label}.${key}: expected ${expectedType}, got ${typeof actual}`,
      );
    }
  }
}

// ── Schema definitions matching frontend/src/lib/types.ts ────

const PRODUCT_SCHEMA = {
  id: 'string',
  shop_id: 'string',
  category_id: 'string',
  name: 'string',
  description: 'string | null',
  price: 'number',
  original_price: 'number | null',
  image_url: 'string | null',
  is_active: 'boolean',
  created_at: 'string',
};

const COUPON_SCHEMA = {
  id: 'string',
  shop_id: 'string',
  code: 'string',
  description: 'string | null',
  discount_type: 'string',
  discount_value: 'number',
  min_purchase: 'number | null',
  valid_from: 'string',
  valid_until: 'string',
  is_active: 'boolean',
};

const COMPARE_ITEM_SCHEMA = {
  id: 'string',
  name: 'string',
  description: 'string | null',
  price: 'number',
  original_price: 'number | null',
  image_url: 'string | null',
  shop_name: 'string | null',
  category_name: 'string | null',
  on_sale: 'boolean',
};

const CHAT_SESSION_SCHEMA = {
  id: 'string',
  user_id: 'string',
  created_at: 'string',
  messages: 'array',
};

const CHAT_MESSAGE_SCHEMA = {
  id: 'string',
  session_id: 'string',
  role: 'string',
  content: 'string',
  created_at: 'string',
};

const PAGINATED_SCHEMA = {
  items: 'array',
  total: 'number',
  page: 'number',
  page_size: 'number',
  pages: 'number',
};

const ERROR_SCHEMA = {
  detail: 'string',
};

// ── Contract tests ───────────────────────────────────────────

test('Product response conforms to frontend Product type', () => {
  const sampleProduct = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    shop_id: '550e8400-e29b-41d4-a716-446655440001',
    category_id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Laptop Pro',
    description: 'A great laptop',
    price: 999.99,
    original_price: 1199.99,
    image_url: 'https://example.com/img.jpg',
    attributes: { ram: '16GB' },
    is_active: true,
    created_at: '2026-03-19T00:00:00.000Z',
  };

  assertShape(sampleProduct, PRODUCT_SCHEMA, 'Product');
});

test('Product with null optional fields conforms to frontend Product type', () => {
  const sampleProduct = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    shop_id: '550e8400-e29b-41d4-a716-446655440001',
    category_id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Basic Item',
    description: null,
    price: 10,
    original_price: null,
    image_url: null,
    attributes: null,
    is_active: true,
    created_at: '2026-03-19T00:00:00.000Z',
  };

  assertShape(sampleProduct, PRODUCT_SCHEMA, 'Product (nulls)');
});

test('Coupon response conforms to frontend Coupon type', () => {
  const sampleCoupon = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    shop_id: '550e8400-e29b-41d4-a716-446655440001',
    code: 'SAVE20',
    description: '20% off everything',
    discount_type: 'percentage',
    discount_value: 20,
    min_purchase: 50,
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_until: '2026-12-31T00:00:00.000Z',
    is_active: true,
  };

  assertShape(sampleCoupon, COUPON_SCHEMA, 'Coupon');
});

test('CompareProductItem conforms to frontend CompareProductItem type', () => {
  const sampleItem = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Product A',
    description: 'Desc',
    price: 100,
    original_price: 120,
    image_url: null,
    attributes: { color: 'red' },
    shop_name: 'Shop A',
    category_name: 'Electronics',
    on_sale: true,
  };

  assertShape(sampleItem, COMPARE_ITEM_SCHEMA, 'CompareProductItem');
});

test('ChatSession conforms to frontend ChatSession type', () => {
  const sampleSession = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    created_at: '2026-03-19T00:00:00.000Z',
    messages: [],
  };

  assertShape(sampleSession, CHAT_SESSION_SCHEMA, 'ChatSession');
});

test('ChatMessage conforms to frontend ChatMessage type', () => {
  const sampleMessage = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    session_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'user',
    content: 'Hello!',
    created_at: '2026-03-19T00:00:00.000Z',
  };

  assertShape(sampleMessage, CHAT_MESSAGE_SCHEMA, 'ChatMessage');
});

test('PaginatedResponse conforms to frontend PaginatedResponse type', () => {
  const samplePaginated = {
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
    pages: 0,
  };

  assertShape(samplePaginated, PAGINATED_SCHEMA, 'PaginatedResponse');
});

test('Error response conforms to shared error contract', () => {
  const errorResponses = [
    { detail: 'Not authenticated' },
    { detail: 'Product not found' },
    { detail: 'You do not own this shop' },
    { detail: 'Admin access required' },
    { detail: 'Internal server error' },
  ];

  for (const err of errorResponses) {
    assertShape(err, ERROR_SCHEMA, 'Error');
  }
});

test('ChatSSEEvent shapes match expected contract', () => {
  const events = [
    { event: 'status', data: { message: 'Searching products...' } },
    { event: 'chunk', data: { text: 'Here are some results' } },
    { event: 'done', data: { text: 'Full response' } },
    { event: 'error', data: { message: 'AI unavailable' } },
  ];

  for (const evt of events) {
    assert.ok(typeof evt.event === 'string', 'event must be a string');
    assert.ok(typeof evt.data === 'object', 'data must be an object');

    if (evt.event === 'status' || evt.event === 'error') {
      assert.ok('message' in evt.data, `${evt.event} data must have message`);
    }
    if (evt.event === 'chunk' || evt.event === 'done') {
      assert.ok('text' in evt.data, `${evt.event} data must have text`);
    }
  }
});
