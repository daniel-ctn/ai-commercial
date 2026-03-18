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

export interface AdminStats {
  total_users: number
  total_shops: number
  active_shops: number
  total_products: number
  active_products: number
  total_coupons: number
  active_coupons: number
  total_categories: number
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
