/**
 * Deals/Coupons page — /deals
 *
 * Shows all currently active coupons and on-sale products.
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import ProductCard from '#/components/product/ProductCard'
import { couponsQueryOptions, productsQueryOptions } from '#/lib/queries'
import { useFavoriteIds } from '#/lib/favorites'
import { buildSeoHead } from '#/lib/seo'

export const Route = createFileRoute('/deals')({
  head: () =>
    buildSeoHead({
      title: 'Deals & Coupons - AI Commercial',
      description:
        'Find the best deals, active coupons, and on-sale products across all shops on AI Commercial.',
      path: '/deals',
    }),
  component: DealsPage,
})

function DealsPage() {
  const { data: coupons, isLoading: couponsLoading } = useQuery(
    couponsQueryOptions({ page_size: 50 }),
  )
  const { data: saleProducts, isLoading: productsLoading } = useQuery(
    productsQueryOptions({ on_sale: true, page_size: 12 }),
  )
  const { isFavorite, toggle: toggleFavorite } = useFavoriteIds()

  return (
    <main className="page-wrap py-8">
      <h1 className="display-title mb-2 text-3xl font-bold">Deals & Coupons</h1>
      <p className="mb-8 text-muted-foreground">
        Find the best discounts and coupon codes from all shops
      </p>

      {/* ── Coupons ──────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Active Coupons</h2>

        {couponsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : coupons && coupons.items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.items.map((coupon) => {
              const expiresDate = new Date(coupon.valid_until)
              const daysLeft = Math.ceil(
                (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              )

              return (
                <Card key={coupon.id} className="relative overflow-hidden">
                  {/* Accent bar */}
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                  <CardContent className="p-5 pl-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-dashed font-mono text-base tracking-wider"
                      >
                        {coupon.code}
                      </Badge>
                      <Badge>
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}% OFF`
                          : `$${coupon.discount_value} OFF`}
                      </Badge>
                    </div>

                    {coupon.description && (
                      <p className="mb-2 text-sm">{coupon.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {coupon.min_purchase && (
                        <span>Min. purchase: ${coupon.min_purchase}</span>
                      )}
                      <span className={daysLeft <= 3 ? 'text-destructive font-medium' : ''}>
                        {daysLeft <= 0
                          ? 'Expires today'
                          : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No active coupons right now. Check back soon!
          </p>
        )}
      </section>

      <Separator />

      {/* ── On-Sale Products ─────────────────────────────────── */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">On Sale</h2>
          {saleProducts && saleProducts.total > 12 && (
            <Link to="/products" search={{ on_sale: true }} className="text-sm">
              View all sale items
            </Link>
          )}
        </div>

        {productsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : saleProducts && saleProducts.items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {saleProducts.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No sale items right now
          </p>
        )}
      </section>
    </main>
  )
}
