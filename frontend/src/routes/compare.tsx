import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Trash2, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { compareQueryOptions } from '#/lib/queries'
import { useCompareList } from '#/lib/compare'

export const Route = createFileRoute('/compare')({
  component: ComparePage,
})

function ComparePage() {
  const { ids, count, remove, clear } = useCompareList()

  const { data, isLoading, isError } = useQuery(compareQueryOptions(ids))

  if (count < 2) {
    return <EmptyState count={count} />
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="display-title text-3xl font-bold">Compare Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparing {count} product{count !== 1 && 's'} side by side
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clear}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear all
        </Button>
      </div>

      {isLoading ? (
        <CompareSkeletons count={count} />
      ) : isError || !data ? (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">
            Failed to load comparison data. Please try again.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[140px] bg-background p-3 text-left text-sm font-medium text-muted-foreground" />
                {data.products.map((product) => (
                  <th
                    key={product.id}
                    className="min-w-[200px] border-l border-border p-3 text-left align-top"
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        className="absolute -right-1 -top-1 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Remove from comparison"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <Link
                        to="/products/$productId"
                        params={{ productId: product.id }}
                        className="group block"
                      >
                        <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg bg-muted">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground/30">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            </div>
                          )}
                        </div>
                        <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                          {product.name}
                        </h3>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price row */}
              <CompareRow label="Price">
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3">
                    <span className="text-lg font-bold">${p.price.toFixed(2)}</span>
                    {p.on_sale && p.original_price && (
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        ${p.original_price.toFixed(2)}
                      </span>
                    )}
                  </td>
                ))}
              </CompareRow>

              {/* Sale badge row */}
              <CompareRow label="On Sale" highlighted>
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3">
                    {p.on_sale ? (
                      <Badge variant="destructive">
                        -{Math.round((1 - p.price / p.original_price!) * 100)}% OFF
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </CompareRow>

              {/* Shop row */}
              <CompareRow label="Shop">
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3 text-sm">
                    {p.shop_name ?? '—'}
                  </td>
                ))}
              </CompareRow>

              {/* Category row */}
              <CompareRow label="Category" highlighted>
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3 text-sm">
                    {p.category_name ? (
                      <Badge variant="secondary">{p.category_name}</Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                ))}
              </CompareRow>

              {/* Description row */}
              <CompareRow label="Description">
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3 text-sm text-muted-foreground">
                    <p className="line-clamp-4">{p.description || '—'}</p>
                  </td>
                ))}
              </CompareRow>

              {/* Dynamic attribute rows */}
              {data.attribute_keys.length > 0 && (
                <tr>
                  <td
                    colSpan={data.products.length + 1}
                    className="bg-muted/50 p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Specifications
                  </td>
                </tr>
              )}
              {data.attribute_keys.map((key, i) => (
                <CompareRow key={key} label={key} highlighted={i % 2 === 0}>
                  {data.products.map((p) => (
                    <td key={p.id} className="border-l border-border p-3 text-sm">
                      {p.attributes?.[key] != null
                        ? String(p.attributes[key])
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </CompareRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

function CompareRow({
  label,
  highlighted,
  children,
}: {
  label: string
  highlighted?: boolean
  children: React.ReactNode
}) {
  return (
    <tr className={highlighted ? 'bg-muted/30' : ''}>
      <td className="sticky left-0 z-10 bg-background p-3 text-sm font-medium capitalize text-muted-foreground">
        {label}
      </td>
      {children}
    </tr>
  )
}

function CompareSkeletons({ count }: { count: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="min-w-[200px] space-y-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ count }: { count: number }) {
  return (
    <main className="page-wrap py-8">
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="display-title text-2xl font-bold">Compare Products</h1>
        <p className="max-w-md text-muted-foreground">
          {count === 0
            ? 'Select at least 2 products to compare them side by side. Use the compare button on product cards to add them.'
            : 'Select one more product to start comparing. Use the compare button on product cards.'}
        </p>
        <Link to="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    </main>
  )
}
