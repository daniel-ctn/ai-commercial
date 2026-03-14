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

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import ProductCard from '#/components/product/ProductCard'
import { productsQueryOptions, categoriesQueryOptions } from '#/lib/queries'

interface ProductSearch {
  page?: number
  search?: string
  category?: string
  shop_id?: string
  min_price?: number
  max_price?: number
  on_sale?: boolean
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
  }),
  component: ProductsPage,
})

function ProductsPage() {
  const filters = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const { data, isLoading } = useQuery(
    productsQueryOptions({
      page: filters.page || 1,
      search: filters.search,
      category: filters.category,
      shop_id: filters.shop_id,
      min_price: filters.min_price,
      max_price: filters.max_price,
      on_sale: filters.on_sale,
    }),
  )

  const { data: categories } = useQuery(categoriesQueryOptions())

  const updateFilters = (updates: Partial<ProductSearch>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        page: updates.page ?? 1, // Reset to page 1 when filters change
      }),
    })
  }

  return (
    <main className="page-wrap py-8">
      <h1 className="display-title mb-6 text-3xl font-bold">Products</h1>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Input
          placeholder="Search products..."
          className="w-full sm:w-64"
          defaultValue={filters.search ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateFilters({ search: e.currentTarget.value || undefined })
            }
          }}
        />

        {/* Category filter */}
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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

        {/* Price range */}
        <Input
          type="number"
          placeholder="Min $"
          className="w-24"
          defaultValue={filters.min_price ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = Number(e.currentTarget.value)
              updateFilters({ min_price: val || undefined })
            }
          }}
        />
        <Input
          type="number"
          placeholder="Max $"
          className="w-24"
          defaultValue={filters.max_price ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = Number(e.currentTarget.value)
              updateFilters({ max_price: val || undefined })
            }
          }}
        />

        <Button
          variant={filters.on_sale ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilters({ on_sale: !filters.on_sale || undefined })}
        >
          On Sale
        </Button>

        {/* Clear all */}
        {(filters.search || filters.category || filters.min_price || filters.max_price || filters.on_sale) && (
          <Button
            variant="ghost"
            size="sm"
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
              <ProductCard key={product.id} product={product} />
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
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">No products found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}
    </main>
  )
}
