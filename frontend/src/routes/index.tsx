import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  TrendingUp,
  Store,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import ProductCard from '#/components/product/ProductCard'
import {
  productsQueryOptions,
  categoriesQueryOptions,
  couponsQueryOptions,
  shopsQueryOptions,
} from '#/lib/queries'
import { useRecentlyViewed, clearRecentlyViewed } from '#/lib/recently-viewed'
import { useFavoriteIds } from '#/lib/favorites'
import { useAuth } from '#/lib/auth'
import { absoluteUrl, buildSeoHead } from '#/lib/seo'

export const Route = createFileRoute('/')({
  head: () =>
    buildSeoHead({
      title: 'AI Commercial - Smart Shopping, Better Deals',
      description:
        'Discover trending products, compare prices across shops, and find the best deals with AI-powered shopping recommendations.',
      path: '/',
    }),
  component: HomePage,
})

function HomePage() {
  const { user } = useAuth()
  const recentlyViewed = useRecentlyViewed()
  const { isFavorite, toggle: toggleFavorite } = useFavoriteIds()

  const { data: categories } = useQuery(categoriesQueryOptions())
  const { data: trendingProducts, isLoading: trendingLoading } = useQuery(
    productsQueryOptions({ page_size: 8 }),
  )
  const { data: saleProducts, isLoading: saleLoading } = useQuery(
    productsQueryOptions({ on_sale: true, page_size: 4, sort: 'discount' }),
  )
  const { data: coupons } = useQuery(couponsQueryOptions({ page_size: 4 }))
  const { data: shops } = useQuery(shopsQueryOptions({ page_size: 6 }))

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AI Commercial',
    description: 'Intelligent shopping platform with AI-powered product discovery and comparison.',
    url: absoluteUrl('/'),
  }

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Shopping
          </Badge>
          <h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Find the best deals,{' '}
            <span className="text-primary">compare smarter</span>
          </h1>
          <p className="mb-8 max-w-xl text-lg text-muted-foreground">
            Browse products across multiple shops, compare prices side by side, and get
            AI-powered recommendations — all in one place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/products">
              <Button size="lg">
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/deals">
              <Button variant="outline" size="lg">
                <Tag className="mr-2 h-4 w-4" />
                Today's Deals
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────── */}
      {categories && categories.length > 0 && (
        <section className="mt-12">
          <SectionHeader title="Shop by Category" />
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.flatMap((cat) =>
              cat.children && cat.children.length > 0
                ? cat.children.map((child) => (
                    <Link
                      key={child.id}
                      to="/products"
                      search={{ category: child.slug }}
                      className="group flex items-center gap-3 rounded-xl border border-border p-4 no-underline transition hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Tag className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium group-hover:text-primary">
                          {child.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{cat.name}</p>
                      </div>
                    </Link>
                  ))
                : [
                    <Link
                      key={cat.id}
                      to="/products"
                      search={{ category: cat.slug }}
                      className="group flex items-center gap-3 rounded-xl border border-border p-4 no-underline transition hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Tag className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium group-hover:text-primary">
                        {cat.name}
                      </p>
                    </Link>,
                  ],
            )}
          </div>
        </section>
      )}

      {/* ── Trending Products ─────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeader
          title="Trending Products"
          icon={<TrendingUp className="h-5 w-5" />}
          linkTo="/products"
          linkLabel="View all"
        />
        {trendingLoading ? (
          <ProductSkeletonGrid count={4} />
        ) : trendingProducts && trendingProducts.items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {trendingProducts.items.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <EmptySection message="No products available yet" />
        )}
      </section>

      {/* ── Best Deals ────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeader
          title="Best Deals"
          icon={<Tag className="h-5 w-5" />}
          linkTo="/deals"
          linkLabel="All deals"
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {saleLoading ? (
              <ProductSkeletonGrid count={4} columns="sm:grid-cols-2" />
            ) : saleProducts && saleProducts.items.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
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
              <EmptySection message="No sale items right now" />
            )}
          </div>

          {/* Active Coupons sidebar */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Active Coupons
            </h3>
            {coupons && coupons.items.length > 0 ? (
              coupons.items.map((coupon) => {
                const daysLeft = Math.ceil(
                  (new Date(coupon.valid_until).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                )
                return (
                  <div
                    key={coupon.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-dashed font-mono text-sm"
                      >
                        {coupon.code}
                      </Badge>
                      <Badge variant="secondary">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `$${coupon.discount_value}`}{' '}
                        OFF
                      </Badge>
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground">
                        {coupon.description}
                      </p>
                    )}
                    <p
                      className={`mt-1 text-xs ${daysLeft <= 3 ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                    >
                      {daysLeft <= 0
                        ? 'Expires today!'
                        : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                    </p>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No active coupons right now
              </p>
            )}
            <Link to="/deals" className="block text-sm text-primary">
              See all deals &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Shop Spotlights ───────────────────────────────────── */}
      {shops && shops.items.length > 0 && (
        <section className="mt-12">
          <SectionHeader
            title="Shop Spotlights"
            icon={<Store className="h-5 w-5" />}
            linkTo="/shops"
            linkLabel="All shops"
          />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {shops.items.slice(0, 6).map((shop) => (
              <Link
                key={shop.id}
                to="/shops/$shopId"
                params={{ shopId: shop.id }}
                className="group flex items-center gap-4 rounded-xl border border-border p-4 no-underline transition hover:shadow-md"
              >
                {shop.logo_url ? (
                  <img
                    src={shop.logo_url}
                    alt={shop.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {shop.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium group-hover:text-primary">
                    {shop.name}
                  </p>
                  {shop.description && (
                    <p className="truncate text-xs text-muted-foreground">
                      {shop.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Because You Viewed (personalized) ─────────────────── */}
      {user && recentlyViewed.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Because You Viewed</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearRecentlyViewed()}
            >
              Clear
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recentlyViewed.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                to="/products/$productId"
                params={{ productId: item.id }}
                className="flex items-center gap-3 rounded-lg border border-border p-3 no-underline transition hover:shadow-md"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40">
                      N/A
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-sm font-semibold text-foreground">
                    ${item.price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Recently Viewed (unauthenticated) ─────────────────── */}
      {!user && recentlyViewed.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Recently Viewed</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearRecentlyViewed()}
            >
              Clear
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recentlyViewed.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                to="/products/$productId"
                params={{ productId: item.id }}
                className="flex items-center gap-3 rounded-lg border border-border p-3 no-underline transition hover:shadow-md"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40">
                      N/A
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-sm font-semibold text-foreground">
                    ${item.price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function SectionHeader({
  title,
  icon,
  linkTo,
  linkLabel,
}: {
  title: string
  icon?: React.ReactNode
  linkTo?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="text-sm text-primary">
          {linkLabel} &rarr;
        </Link>
      )}
    </div>
  )
}

function ProductSkeletonGrid({
  count,
  columns = 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}: {
  count: number
  columns?: string
}) {
  return (
    <div className={`grid gap-6 ${columns}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
