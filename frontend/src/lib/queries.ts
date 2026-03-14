/**
 * TanStack Query hooks for products, shops, categories, and coupons.
 *
 * == queryOptions pattern (recap) ==
 *
 * Each `queryOptions()` bundles a query key + fetch function:
 *   - Query key: unique identifier for the cached data (like a cache key)
 *   - Query function: the async function that fetches the data
 *
 * When the key changes (e.g., different page or filter), TanStack Query
 * automatically refetches. This is like Next.js `revalidatePath()` but
 * automatic and client-side.
 *
 * == Why separate queryOptions from hooks? ==
 *
 * queryOptions can be used in TWO places:
 *   1. In components: `useQuery(productsQueryOptions({ page: 1 }))`
 *   2. In route loaders: `queryClient.ensureQueryData(productsQueryOptions(...))`
 *
 * Route loaders let you start fetching BEFORE the page renders (like
 * Next.js `getServerSideProps` or `loader` in Remix).
 */

import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api'
import type { Category, Coupon, PaginatedResponse, Product, Shop } from '#/lib/types'

// ── Products ────────────────────────────────────────────────────

interface ProductFilters {
  page?: number
  page_size?: number
  search?: string
  category?: string
  shop_id?: string
  min_price?: number
  max_price?: number
  on_sale?: boolean
}

export const productsQueryOptions = (filters: ProductFilters = {}) => {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  if (filters.search) params.set('search', filters.search)
  if (filters.category) params.set('category', filters.category)
  if (filters.shop_id) params.set('shop_id', filters.shop_id)
  if (filters.min_price !== undefined) params.set('min_price', String(filters.min_price))
  if (filters.max_price !== undefined) params.set('max_price', String(filters.max_price))
  if (filters.on_sale) params.set('on_sale', 'true')

  const queryString = params.toString()

  return queryOptions({
    queryKey: ['products', filters],
    queryFn: () =>
      api.get<PaginatedResponse<Product>>(
        `/products${queryString ? `?${queryString}` : ''}`,
      ),
  })
}

export const productQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['products', id],
    queryFn: () => api.get<Product>(`/products/${id}`),
  })

// ── Shops ───────────────────────────────────────────────────────

interface ShopFilters {
  page?: number
  page_size?: number
  search?: string
}

export const shopsQueryOptions = (filters: ShopFilters = {}) => {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  if (filters.search) params.set('search', filters.search)

  const queryString = params.toString()

  return queryOptions({
    queryKey: ['shops', filters],
    queryFn: () =>
      api.get<PaginatedResponse<Shop>>(
        `/shops${queryString ? `?${queryString}` : ''}`,
      ),
  })
}

export const shopQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['shops', id],
    queryFn: () => api.get<Shop>(`/shops/${id}`),
  })

// ── Categories ──────────────────────────────────────────────────

export const categoriesQueryOptions = (flat = false) =>
  queryOptions({
    queryKey: ['categories', { flat }],
    queryFn: () =>
      api.get<Category[]>(`/categories${flat ? '?flat=true' : ''}`),
    staleTime: 10 * 60 * 1000, // Categories rarely change — cache 10 min
  })

// ── Coupons ─────────────────────────────────────────────────────

interface CouponFilters {
  page?: number
  page_size?: number
  shop_id?: string
  active_only?: boolean
}

export const couponsQueryOptions = (filters: CouponFilters = {}) => {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  if (filters.shop_id) params.set('shop_id', filters.shop_id)
  if (filters.active_only !== undefined)
    params.set('active_only', String(filters.active_only))

  const queryString = params.toString()

  return queryOptions({
    queryKey: ['coupons', filters],
    queryFn: () =>
      api.get<PaginatedResponse<Coupon>>(
        `/coupons${queryString ? `?${queryString}` : ''}`,
      ),
  })
}
