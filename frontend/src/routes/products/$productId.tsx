import { useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import { productQueryOptions, useAddToCart } from '#/lib/queries'
import { useAuth } from '#/lib/auth'
import { trackProductView } from '#/lib/recently-viewed'
import { absoluteUrl, buildSeoHead } from '#/lib/seo'

export const Route = createFileRoute('/products/$productId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueryOptions(params.productId)),
  head: ({ loaderData }) => {
    const product = loaderData
    if (!product) return {}

    return buildSeoHead({
      title: `${product.name} - $${product.price} | AI Commercial`,
      description:
        product.description?.slice(0, 160) ??
        `Shop ${product.name} for $${product.price} on AI Commercial.`,
      path: `/products/${product.id}`,
      image: product.image_url ?? '/logo.png',
      type: 'product',
    })
  },
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { productId } = Route.useParams()
  const { data: product, isLoading } = useQuery(productQueryOptions(productId))

  useEffect(() => {
    if (!product) {
      return
    }

    trackProductView({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    })
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

  const { user } = useAuth()
  const addToCart = useAddToCart()

  const isOnSale =
    product.original_price != null && product.original_price > product.price
  const discount = isOnSale
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0

  const productUrl = absoluteUrl(`/products/${product.id}`)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url: productUrl,
    description: product.description ?? undefined,
    image: product.image_url ? absoluteUrl(product.image_url) : undefined,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      price: product.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    ...(product.shop_name
      ? { brand: { '@type': 'Brand', name: product.shop_name } }
      : {}),
  }

  return (
    <main className="page-wrap py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/products" className="hover:text-foreground">
          Products
        </Link>
        <span>/</span>
        {product.category_name && (
          <>
            <span>{product.category_name}</span>
            <span>/</span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="96"
                height="96"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}
          {isOnSale && (
            <Badge className="absolute left-3 top-3 text-base" variant="destructive">
              -{discount}% OFF
            </Badge>
          )}
        </div>

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

          <h1 className="display-title mb-4 text-3xl font-bold">
            {product.name}
          </h1>

          <div className="mb-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold">${product.price.toFixed(2)}</span>
            {isOnSale && (
              <span className="text-lg text-muted-foreground line-through">
                ${product.original_price!.toFixed(2)}
              </span>
            )}
          </div>

          {user && (
            <Button
              size="lg"
              className="mb-4 w-full sm:w-auto"
              onClick={() => addToCart.mutate({ product_id: product.id })}
              disabled={addToCart.isPending}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
            </Button>
          )}

          {product.category_name && (
            <Badge variant="secondary" className="mb-4">
              {product.category_name}
            </Badge>
          )}

          <Separator className="my-6" />

          {product.description && (
            <div className="mb-6">
              <h2 className="mb-2 font-semibold">Description</h2>
              <p className="leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

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
