/**
 * Product detail page — /products/:productId
 *
 * == Dynamic Route Params (TanStack vs Next.js) ==
 *
 * Next.js:   app/products/[productId]/page.tsx  → params.productId
 * TanStack:  routes/products/$productId.tsx     → Route.useParams().productId
 *
 * The `$` prefix in the filename is TanStack Router's way of marking
 * a dynamic segment (like `[param]` in Next.js).
 *
 * == Route Loaders ==
 *
 * We use `loader` to start fetching data BEFORE the component renders.
 * This is like Next.js `generateMetadata` + Server Component data fetch —
 * the data is ready by the time the component mounts, avoiding loading spinners.
 *
 * `ensureQueryData` checks the cache first and only fetches if stale.
 */

import { useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import { productQueryOptions } from '#/lib/queries'
import { trackProductView } from '#/lib/recently-viewed'

export const Route = createFileRoute('/products/$productId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueryOptions(params.productId)),
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { productId } = Route.useParams()
  const { data: product, isLoading } = useQuery(productQueryOptions(productId))

  useEffect(() => {
    if (product) {
      trackProductView({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      })
    }
  }, [product])

  if (isLoading || !product) {
    return (
      <main className="page-wrap py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </main>
    )
  }

  const isOnSale = product.original_price && product.original_price > product.price
  const discount = isOnSale
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0

  return (
    <main className="page-wrap py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/products" className="hover:text-foreground">
          Products
        </Link>
        <span>/</span>
        {product.category_name && (
          <>
            <Link
              to="/products"
              search={{ category: product.category_id }}
              className="hover:text-foreground"
            >
              {product.category_name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* ── Image ──────────────────────────────────────────── */}
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
          )}
          {isOnSale && (
            <Badge className="absolute left-3 top-3 text-base" variant="destructive">
              -{discount}% OFF
            </Badge>
          )}
        </div>

        {/* ── Details ────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {product.shop_name && (
              <Link
                to="/shops/$shopId"
                params={{ shopId: product.shop_id }}
                className="hover:text-foreground"
              >
                {product.shop_name}
              </Link>
            )}
          </p>

          <h1 className="display-title mb-4 text-3xl font-bold">{product.name}</h1>

          {/* Price */}
          <div className="mb-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold">${product.price.toFixed(2)}</span>
            {isOnSale && (
              <span className="text-lg text-muted-foreground line-through">
                ${product.original_price!.toFixed(2)}
              </span>
            )}
          </div>

          {product.category_name && (
            <Badge variant="secondary" className="mb-4">
              {product.category_name}
            </Badge>
          )}

          <Separator className="my-6" />

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <h2 className="mb-2 font-semibold">Description</h2>
              <p className="leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          {/* Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 font-semibold">Specifications</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(product.attributes).map(([key, value]) => (
                    <div key={key} className="contents">
                      <dt className="font-medium capitalize text-muted-foreground">
                        {key}
                      </dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
