import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { api } from '#/lib/api'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Truck, Package } from 'lucide-react'

export const Route = createFileRoute('/shop-admin/orders')({
  component: ShopAdminOrdersPage,
})

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-red-100 text-red-800',
}

function ShopAdminOrdersPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['shop-admin', 'orders', page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (statusFilter) params.set('status', statusFilter)
      return api.get<any>(`/shop-admin/orders?${params}`)
    },
  })

  const markShipped = useMutation({
    mutationFn: (orderId: string) =>
      api.patch(`/shop-admin/orders/${orderId}/status`, { status: 'shipped' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-admin', 'orders'] })
      toast.success('Order marked as shipped')
    },
  })

  const orders = data?.items ?? []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8" />
                  No orders yet
                </td>
              </tr>
            ) : (
              orders.map((order: any) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusColors[order.status] ?? ''}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3">${Number(order.total).toFixed(2)}</td>
                  <td className="px-4 py-3">{order.items?.length ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {order.status === 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markShipped.mutate(order.id)}
                        disabled={markShipped.isPending}
                      >
                        <Truck className="mr-1 h-3 w-3" /> Ship
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
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
