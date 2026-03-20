/**
 * Shared TypeScript types matching the backend Pydantic schemas.
 *
 * == Why mirror the backend types? ==
 *
 * In Next.js with tRPC or Prisma, types are auto-generated. Since our
 * backend is a separate NestJS service, we manually define TypeScript types
 * that match the API response shapes.
 *
 * Keep these in sync with backend-nest/src/* DTOs and serialized entities.
 */

// ── Pagination ──────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

// ── Category ────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  children?: Category[]
}

// ── Shop ────────────────────────────────────────────────────────

export interface Shop {
  id: string
  owner_id: string
  name: string
  description: string | null
  logo_url: string | null
  website: string | null
  is_active: boolean
  created_at: string
}

// ── Product ─────────────────────────────────────────────────────

export interface Product {
  id: string
  shop_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  original_price: number | null
  image_url: string | null
  attributes: Record<string, string | number | boolean> | null
  is_active: boolean
  created_at: string
  shop_name?: string | null
  category_name?: string | null
}

// ── Coupon ──────────────────────────────────────────────────────

export interface Coupon {
  id: string
  shop_id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase: number | null
  valid_from: string
  valid_until: string
  is_active: boolean
}

// ── Admin ───────────────────────────────────────────────────────

export interface DataQualityStats {
  missing_images: number
  missing_descriptions: number
  missing_attributes: number
}

export interface CategoryCount {
  category: string | null
  count: number
}

export interface AdminStats {
  total_users: number
  total_shops: number
  active_shops: number
  total_products: number
  active_products: number
  total_coupons: number
  active_coupons: number
  total_categories: number
  data_quality?: DataQualityStats
  products_by_category?: CategoryCount[]
}

export interface ShopStats {
  shop_id: string
  shop_name: string
  total_products: number
  active_products: number
  total_coupons: number
  active_coupons: number
  data_quality?: {
    missing_images: number
    missing_descriptions: number
    quality_score: number
  }
}

export interface QualityReport {
  score: number
  issues: string[]
  suggestions: string[]
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  oauth_provider: string | null
  created_at: string
}

export interface AdminShop extends Shop {
  owner_name: string | null
  owner_email: string | null
}

export interface AdminProduct {
  id: string
  shop_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  original_price: number | null
  image_url: string | null
  is_active: boolean
  created_at: string
  shop_name: string | null
  category_name: string | null
}

export interface AdminCoupon extends Coupon {
  shop_name: string | null
}

// ── Compare ────────────────────────────────────────────────────

export interface CompareProductItem {
  id: string
  name: string
  description: string | null
  price: number
  original_price: number | null
  image_url: string | null
  attributes: Record<string, string | number | boolean> | null
  shop_name: string | null
  category_name: string | null
  on_sale: boolean
}

export interface CompareResponse {
  products: CompareProductItem[]
  attribute_keys: string[]
}

// ── Chat ────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  created_at: string
  messages: ChatMessage[]
}

export type ChatSSEEvent =
  | { event: 'status'; data: { message: string } }
  | { event: 'chunk'; data: { text: string } }
  | { event: 'done'; data: { text: string } }
  | { event: 'error'; data: { message: string } }

// ── Cart ─────────────────────────────────────────────────────────

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  product_image: string | null
  shop_name: string
  shop_id: string | null
  quantity: number
  unit_price: number
  line_total: number
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  item_count: number
}

// ── Orders ───────────────────────────────────────────────────────

export interface OrderItem {
  id: string
  product_id: string | null
  shop_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Order {
  id: string
  user_id: string
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  subtotal: number
  discount: number
  total: number
  shipping_name: string | null
  shipping_address: string | null
  items: OrderItem[]
  created_at: string
  updated_at: string
}
