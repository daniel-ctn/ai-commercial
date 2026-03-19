/**
 * Product listing page — /products
 *
 * == Search Params as State (TanStack Router) ==
 *
 * In Next.js, you'd use `useSearchParams()` + `router.push()` to sync
 * filters with the URL. TanStack Router has a cleaner approach:
 *
 *   1. Define the shape of your search params in `validateSearch`
 *   2. Read them type-safely with `Route.useSearch()`
 *   3. Update them with `navigate({ search: { ... } })`
 *
 * This means the URL IS your filter state:
 *   /products?category=laptops&min_price=500&page=2
 *
 * Benefits:
 *   - Shareable URLs (copy-paste the URL to share filtered results)
 *   - Browser back/forward works with filters
 *   - No useState needed for filters
 *   - SSR-friendly (filters are in the URL, not in memory)
 */

import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import ProductCard from '#/components/product/ProductCard'
import { productsQueryOptions, categoriesQueryOptions } from '#/lib/queries'
import { useFavoriteIds } from '#/lib/favorites'
import { buildSeoHead } from '#/lib/seo'

interface ProductSearch {
  page?: number
  search?: string
  category?: string
  shop_id?: string
  min_price?: number
  max_price?: number
  on_sale?: boolean
  sort?: string
}

export const Route = createFileRoute('/products/')({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    page: Number(search.page) || undefined,
    search: (search.search as string) || undefined,
    category: (search.category as string) || undefined,
    shop_id: (search.shop_id as string) || undefined,
    min_price: search.min_price ? Number(search.min_price) : undefined,
    max_price: search.max_price ? Number(search.max_price) : undefined,
    on_sale: search.on_sale === 'true' || search.on_sale === true || undefined,
    sort: (search.sort as string) || undefined,
  }),
  head: () =>
    buildSeoHead({
      title: 'Products - AI Commercial',
      description:
        'Browse and filter products across all shops. Find the best deals, compare prices, and discover new products.',
      path: '/products',
    }),
  component: ProductsPage,
})

function ProductsPage() {
  const filters = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const [minPriceInput, setMinPriceInput] = useState(filters.min_price?.toString() ?? '')
  const [maxPriceInput, setMaxPriceInput] = useState(filters.max_price?.toString() ?? '')

  useEffect(() => {
    setSearchInput(filters.search ?? '')
    setMinPriceInput(filters.min_price?.toString() ?? '')
    setMaxPriceInput(filters.max_price?.toString() ?? '')
  }, [filters.search, filters.min_price, filters.max_price])

  const { data, isLoading } = useQuery(
    productsQueryOptions({
      page: filters.page || 1,
      search: filters.search,
      category: filters.category,
      shop_id: filters.shop_id,
      min_price: filters.min_price,
      max_price: filters.max_price,
      on_sale: filters.on_sale,
      sort: filters.sort,
    }),
  )

  const { data: categories } = useQuery(categoriesQueryOptions())
  const { isFavorite, toggle: toggleFavorite } = useFavoriteIds()

  const updateFilters = (updates: Partial<ProductSearch>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        page: updates.page ?? 1,
      }),
    })
  }

  return (
    <main className="page-wrap py-8">
      <h1 className="display-title mb-6 text-3xl font-bold">Products</h1>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search products..."
          className="w-full sm:w-64"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateFilters({ search: searchInput || undefined })
            }
          }}
        />

        {/* Category filter */}
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-auto"
          value={filters.category ?? ''}
          onChange={(e) =>
            updateFilters({ category: e.target.value || undefined })
          }
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <optgroup key={cat.id} label={cat.name}>
              {cat.children?.map((child) => (
                <option key={child.id} value={child.slug}>
                  {child.name}
                </option>
              ))}
              {(!cat.children || cat.children.length === 0) && (
                <option value={cat.slug}>{cat.name}</option>
              )}
            </optgroup>
          ))}
        </select>

        <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
          {/* Price range */}
          <Input
            type="number"
            placeholder="Min $"
            className="flex-1 sm:w-24 sm:flex-none"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = Number(minPriceInput)
                updateFilters({ min_price: val || undefined })
              }
            }}
          />
          <Input
            type="number"
            placeholder="Max $"
            className="flex-1 sm:w-24 sm:flex-none"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = Number(maxPriceInput)
                updateFilters({ max_price: val || undefined })
              }
            }}
          />
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Button
            variant={filters.on_sale ? 'default' : 'outline'}
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => updateFilters({ on_sale: !filters.on_sale || undefined })}
          >
            On Sale
          </Button>

          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-auto"
            value={filters.sort ?? ''}
            onChange={(e) =>
              updateFilters({ sort: e.target.value || undefined })
            }
          >
            <option value="">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="discount">Biggest Discount</option>
            <option value="best_value">Best Value</option>
          </select>

          {(filters.search || filters.category || filters.min_price || filters.max_price || filters.on_sale || filters.sort) && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() =>
                navigate({
                  search: {},
                })
              }
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {data.total} product{data.total !== 1 && 's'} found
          </p>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          {/* ── Pagination ──────────────────────────────────────── */}
          {data.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => updateFilters({ page: data.page - 1 })}
              >
                Previous
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                Page {data.page} of {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.pages}
                onClick={() => updateFilters({ page: data.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="rounded-full bg-muted p-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            No products match your search
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {filters.search
              ? `No results for "${filters.search}". Try a different search term or remove some filters.`
              : 'Try broadening your filters — remove a category or price range to see more results.'}
          </p>
          {(filters.search || filters.category || filters.min_price || filters.max_price || filters.on_sale || filters.sort) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigate({ search: {} })}
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </main>
  )
}
