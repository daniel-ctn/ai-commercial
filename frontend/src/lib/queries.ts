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

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '#/lib/api'
import type {
  AdminCoupon,
  AdminProduct,
  AdminShop,
  AdminStats,
  AdminUser,
  Category,
  CompareResponse,
  Coupon,
  PaginatedResponse,
  Product,
  Shop,
} from '#/lib/types'

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

// ── Compare ─────────────────────────────────────────────────────

export const compareQueryOptions = (ids: string[]) => {
  const params = new URLSearchParams()
  ids.forEach((id) => params.append('ids', id))

  return queryOptions({
    queryKey: ['compare', ...ids.sort()],
    queryFn: () => api.get<CompareResponse>(`/compare?${params.toString()}`),
    enabled: ids.length >= 2,
  })
}

// ── Admin ────────────────────────────────────────────────────────

export const adminStatsQueryOptions = () =>
  queryOptions({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  })

interface AdminFilters {
  page?: number
  page_size?: number
  search?: string
  role?: string
  is_active?: boolean
  shop_id?: string
}

function buildAdminParams(filters: AdminFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  if (filters.search) params.set('search', filters.search)
  if (filters.role) params.set('role', filters.role)
  if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active))
  if (filters.shop_id) params.set('shop_id', filters.shop_id)
  return params.toString()
}

export const adminUsersQueryOptions = (filters: AdminFilters = {}) => {
  const qs = buildAdminParams(filters)
  return queryOptions({
    queryKey: ['admin', 'users', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AdminUser>>(`/admin/users${qs ? `?${qs}` : ''}`),
  })
}

export const adminShopsQueryOptions = (filters: AdminFilters = {}) => {
  const qs = buildAdminParams(filters)
  return queryOptions({
    queryKey: ['admin', 'shops', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AdminShop>>(`/admin/shops${qs ? `?${qs}` : ''}`),
  })
}

export const adminProductsQueryOptions = (filters: AdminFilters = {}) => {
  const qs = buildAdminParams(filters)
  return queryOptions({
    queryKey: ['admin', 'products', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AdminProduct>>(`/admin/products${qs ? `?${qs}` : ''}`),
  })
}

export const adminCouponsQueryOptions = (filters: AdminFilters = {}) => {
  const qs = buildAdminParams(filters)
  return queryOptions({
    queryKey: ['admin', 'coupons', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AdminCoupon>>(`/admin/coupons${qs ? `?${qs}` : ''}`),
  })
}

// ── Admin Mutations ──────────────────────────────────────────────

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch<AdminUser>(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useToggleShopActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shopId: string) =>
      api.patch<AdminShop>(`/admin/shops/${shopId}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shops'] }),
  })
}

export function useToggleProductActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) =>
      api.patch<AdminProduct>(`/admin/products/${productId}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useToggleCouponActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (couponId: string) =>
      api.patch<AdminCoupon>(`/admin/coupons/${couponId}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  })
}

// ── Admin CRUD via existing endpoints ────────────────────────────

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      shop_id: string
      category_id: string
      name: string
      description?: string
      price: number
      original_price?: number
      image_url?: string
    }) => api.post<Product>('/products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      shop_id: string
      code: string
      description?: string
      discount_type: string
      discount_value: number
      min_purchase?: number
      valid_from: string
      valid_until: string
    }) => api.post<Coupon>('/coupons', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useDeleteCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}
