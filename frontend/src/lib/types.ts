/**
 * Shared TypeScript types matching the backend Pydantic schemas.
 *
 * == Why mirror the backend types? ==
 *
 * In Next.js with tRPC or Prisma, types are auto-generated. Since our
 * backend is a separate Python app, we manually define TypeScript types
 * that match the backend Pydantic schemas.
 *
 * Keep these in sync with backend/app/schemas/*.py
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
