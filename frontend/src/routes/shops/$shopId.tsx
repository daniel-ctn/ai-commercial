import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import ProductCard from '#/components/product/ProductCard'
import {
  shopQueryOptions,
  productsQueryOptions,
  couponsQueryOptions,
} from '#/lib/queries'
import { useFavoriteIds } from '#/lib/favorites'
import { absoluteUrl, buildSeoHead } from '#/lib/seo'

export const Route = createFileRoute('/shops/$shopId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(shopQueryOptions(params.shopId)),
  head: ({ loaderData }) => {
    const shop = loaderData
    if (!shop) return {}

    return buildSeoHead({
      title: `${shop.name} - AI Commercial`,
      description:
        shop.description?.slice(0, 160) ??
        `Shop products from ${shop.name} on AI Commercial.`,
      path: `/shops/${shop.id}`,
      image: shop.logo_url ?? '/logo.png',
    })
  },
  component: ShopDetailPage,
})

function ShopDetailPage() {
  const { shopId } = Route.useParams()

  const { data: shop, isLoading: shopLoading } = useQuery(shopQueryOptions(shopId))
  const { data: products } = useQuery(
    productsQueryOptions({ shop_id: shopId, page_size: 12 }),
  )
  const { data: coupons } = useQuery(couponsQueryOptions({ shop_id: shopId }))
  const { isFavorite, toggle: toggleFavorite } = useFavoriteIds()

  if (shopLoading || !shop) {
    return (
      <main className="page-wrap py-8">
        <Skeleton className="mb-2 h-10 w-64" />
        <Skeleton className="mb-8 h-5 w-96" />
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </main>
    )
  }

  const shopUrl = absoluteUrl(`/shops/${shop.id}`)
  const shopJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    url: shopUrl,
    description: shop.description ?? undefined,
    image: shop.logo_url ? absoluteUrl(shop.logo_url) : undefined,
    sameAs: shop.website ?? undefined,
  }

  return (
    <main className="page-wrap py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shopJsonLd) }}
      />

      <div className="mb-8 flex items-start gap-4">
        {shop.logo_url ? (
          <img
            src={shop.logo_url}
            alt={shop.name}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {shop.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="display-title text-3xl font-bold">{shop.name}</h1>
          {shop.description && (
            <p className="mt-1 text-muted-foreground">{shop.description}</p>
          )}
          {shop.website && (
            <a
              href={shop.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm"
            >
              {shop.website}
            </a>
          )}
        </div>
      </div>

      {coupons && coupons.items.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Active Deals</h2>
          <div className="flex flex-wrap gap-3">
            {coupons.items.map((coupon) => (
              <Card key={coupon.id} className="min-w-[200px]">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-sm">
                      {coupon.code}
                    </Badge>
                    <Badge>
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}% OFF`
                        : `$${coupon.discount_value} OFF`}
                    </Badge>
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-muted-foreground">
                      {coupon.description}
                    </p>
                  )}
                  {coupon.min_purchase && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Min. purchase: ${coupon.min_purchase}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Separator className="my-8" />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Products {products && `(${products.total})`}
          </h2>
          {products && products.total > 12 && (
            <Link to="/products" search={{ shop_id: shopId }} className="text-sm">
              View all
            </Link>
          )}
        </div>

        {products && products.items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.items.map((product) => (
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
            This shop hasn&apos;t added any products yet.
          </p>
        )}
      </section>
    </main>
  )
}
