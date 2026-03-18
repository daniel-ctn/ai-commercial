/**
 * ProductCard — reusable card for product grids.
 *
 * == Component Composition (same as Next.js) ==
 *
 * This is a "presentational" component — it just receives props and renders.
 * No data fetching, no state. The parent decides what data to pass.
 *
 * This pattern works the same in Next.js. The difference is that in
 * TanStack Router, we use `<Link to={...}>` instead of Next's `<Link href={...}>`.
 */

import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftRight, Check, Heart } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardFooter } from '#/components/ui/card'
import { useCompareList } from '#/lib/compare'
import type { Product } from '#/lib/types'

interface ProductCardProps {
  product: Product
  isFavorite?: boolean
  onToggleFavorite?: (productId: string) => void
}

export default memo(function ProductCard({ product, isFavorite, onToggleFavorite }: ProductCardProps) {
  const { isInCompare, toggle, isFull } = useCompareList()
  const inCompare = isInCompare(product.id)
  const isOnSale = product.original_price && product.original_price > product.price
  const discount = isOnSale
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0

  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className="block no-underline"
    >
      <Card className="group h-full overflow-hidden transition hover:shadow-lg">
        <div className="relative aspect-square bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-muted-foreground/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
          )}
          {isOnSale && (
            <Badge className="absolute left-2 top-2" variant="destructive">
              -{discount}%
            </Badge>
          )}
          <button
            type="button"
            title={inCompare ? 'Remove from compare' : isFull ? 'Compare list full (max 5)' : 'Add to compare'}
            disabled={!inCompare && isFull}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggle(product.id)
            }}
            className={`absolute right-2 top-2 rounded-full p-1.5 shadow-sm transition-colors ${
              inCompare
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40'
            }`}
          >
            {inCompare ? <Check className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
          </button>
          {onToggleFavorite && (
            <button
              type="button"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite(product.id)
              }}
              className={`absolute right-2 bottom-2 rounded-full p-1.5 shadow-sm transition-colors ${
                isFavorite
                  ? 'bg-red-500 text-white'
                  : 'bg-background/80 text-muted-foreground hover:bg-background hover:text-red-500'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        <CardContent className="p-4">
          <p className="mb-1 text-xs text-muted-foreground">
            {product.shop_name ?? 'Shop'} &middot; {product.category_name ?? 'Category'}
          </p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
            {product.name}
          </h3>
        </CardContent>

        <CardFooter className="px-4 pb-4 pt-0">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
            {isOnSale && (
              <span className="text-sm text-muted-foreground line-through">
                ${product.original_price!.toFixed(2)}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
})
