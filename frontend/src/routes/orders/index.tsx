import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { myOrdersQueryOptions } from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/orders/')({
  head: () => ({
    meta: [
      { title: 'My Orders | AI Commercial' },
      { name: 'description', content: 'View your order history and track your purchases.' },
    ],
  }),
  component: OrdersPage,
})

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-red-100 text-red-800',
}

function OrdersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery(myOrdersQueryOptions(page))

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">My Orders</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const orders = data?.items ?? []

  if (orders.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No orders yet</h2>
        <p className="mt-2 text-muted-foreground">Your order history will appear here.</p>
        <Link to="/products" className="mt-4 inline-block">
          <Button>Browse products</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order: any) => (
          <Link
            key={order.id}
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            className="block rounded-lg border bg-card p-4 transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Order #{order.id.slice(0, 8)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.items?.length ?? 0} item(s)
                </p>
              </div>
              <div className="text-right">
                <Badge className={statusColors[order.status] ?? ''}>
                  {order.status}
                </Badge>
                <p className="mt-1 font-semibold">${Number(order.total).toFixed(2)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
