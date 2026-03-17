/**
 * Shop listing page — /shops
 */

import { useState, useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { shopsQueryOptions } from '#/lib/queries'

interface ShopSearch {
  page?: number
  search?: string
}

export const Route = createFileRoute('/shops/')({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    page: Number(search.page) || undefined,
    search: (search.search as string) || undefined,
  }),
  component: ShopsPage,
})

function ShopsPage() {
  const filters = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const [searchInput, setSearchInput] = useState(filters.search ?? '')

  useEffect(() => {
    setSearchInput(filters.search ?? '')
  }, [filters.search])

  const { data, isLoading } = useQuery(
    shopsQueryOptions({
      page: filters.page || 1,
      search: filters.search,
    }),
  )

  return (
    <main className="page-wrap py-8">
      <h1 className="display-title mb-6 text-3xl font-bold">Shops</h1>

      <div className="mb-8 flex gap-3">
        <Input
          placeholder="Search shops..."
          className="w-full sm:w-64"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate({
                search: {
                  search: searchInput || undefined,
                  page: 1,
                },
              })
            }
          }}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {data.total} shop{data.total !== 1 && 's'}
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((shop) => (
              <Link
                key={shop.id}
                to="/shops/$shopId"
                params={{ shopId: shop.id }}
                className="block no-underline"
              >
                <Card className="h-full transition hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-3">
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
                      <CardTitle className="text-lg">{shop.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {shop.description || 'No description'}
                    </p>
                  </CardContent>
                  {shop.website && (
                    <CardFooter>
                      <p className="truncate text-xs text-muted-foreground">
                        {shop.website}
                      </p>
                    </CardFooter>
                  )}
                </Card>
              </Link>
            ))}
          </div>

          {data.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() =>
                  navigate({ search: (prev) => ({ ...prev, page: data.page - 1 }) })
                }
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
                onClick={() =>
                  navigate({ search: (prev) => ({ ...prev, page: data.page + 1 }) })
                }
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">No shops found</p>
        </div>
      )}
    </main>
  )
}
