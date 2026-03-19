import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Trash2, X, Plus, Clock, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { compareQueryOptions, compareSummaryQueryOptions } from '#/lib/queries'
import { useCompareList } from '#/lib/compare'
import { useRecentlyViewed } from '#/lib/recently-viewed'

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
      <AiCompareSummary ids={ids} />

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

              <CompareRow label="On Sale" highlighted>
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3">
                    {p.on_sale ? (
                      <Badge variant="destructive">
                        -{Math.round((1 - p.price / p.original_price!) * 100)}% OFF
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                ))}
              </CompareRow>

              <CompareRow label="Shop">
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3 text-sm">
                    {p.shop_name ?? '-'}
                  </td>
                ))}
              </CompareRow>

              <CompareRow label="Category" highlighted>
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3 text-sm">
                    {p.category_name ? (
                      <Badge variant="secondary">{p.category_name}</Badge>
                    ) : (
                      '-'
                    )}
                  </td>
                ))}
              </CompareRow>

              <CompareRow label="Description">
                {data.products.map((p) => (
                  <td key={p.id} className="border-l border-border p-3 text-sm text-muted-foreground">
                    <p className="line-clamp-4">{p.description || '-'}</p>
                  </td>
                ))}
              </CompareRow>

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
                      {p.attributes?.[key] != null ? (
                        String(p.attributes[key])
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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

function AiCompareSummary({ ids }: { ids: string[] }) {
  const { data, isLoading, isError } = useQuery(compareSummaryQueryOptions(ids))

  if (isError) return null

  return (
    <div className="mb-6 rounded-xl border border-border bg-muted/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Comparison Summary</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating summary...
        </div>
      ) : data?.summary ? (
        <div className="prose prose-sm max-w-none text-sm text-muted-foreground [&_strong]:text-foreground">
          {data.summary.split('\n\n').map((para, i) => {
            const lines = para.split('\n')
            const isList = lines.every(
              (l) => l.trim().startsWith('- ') || l.trim().startsWith('* ') || l.trim() === '',
            )
            if (isList && lines.some((l) => l.trim())) {
              return (
                <ul key={i} className="my-1 list-disc space-y-0.5 pl-4">
                  {lines
                    .filter((l) => l.trim())
                    .map((line, j) => (
                      <li key={j}>
                        <SummaryInline text={line.replace(/^[-*]\s*/, '')} />
                      </li>
                    ))}
                </ul>
              )
            }
            return (
              <p key={i} className="my-1">
                {lines.map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    <SummaryInline text={line} />
                  </span>
                ))}
              </p>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function SummaryInline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
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
  const recentlyViewed = useRecentlyViewed()
  const { add, isInCompare, isFull } = useCompareList()

  return (
    <main className="page-wrap py-8">
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
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

      {recentlyViewed.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recently Viewed</h2>
            <span className="text-sm text-muted-foreground">
              - quick add to compare
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recentlyViewed.slice(0, 8).map((item) => {
              const alreadyAdded = isInCompare(item.id)
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
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
                    <p className="text-sm text-muted-foreground">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant={alreadyAdded ? 'secondary' : 'outline'}
                    size="icon-xs"
                    disabled={alreadyAdded || isFull}
                    onClick={() => add(item.id)}
                    title={
                      alreadyAdded
                        ? 'Already added'
                        : isFull
                          ? 'Compare list full'
                          : 'Add to compare'
                    }
                  >
                    {alreadyAdded ? (
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
