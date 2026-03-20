import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orderDetailQueryOptions } from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { ArrowLeft, CheckCircle, Clock, Package, Truck, XCircle } from 'lucide-react'

export const Route = createFileRoute('/orders/$orderId')({
  component: OrderDetailPage,
})

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-600', label: 'Pending' },
  paid: { icon: CheckCircle, color: 'text-blue-600', label: 'Paid' },
  shipped: { icon: Truck, color: 'text-purple-600', label: 'Shipped' },
  delivered: { icon: Package, color: 'text-green-600', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'text-gray-600', label: 'Cancelled' },
  refunded: { icon: XCircle, color: 'text-red-600', label: 'Refunded' },
}

const statusSteps = ['pending', 'paid', 'shipped', 'delivered']

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const { data: order, isLoading } = useQuery(orderDetailQueryOptions(orderId))

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <h2 className="text-xl font-semibold">Order not found</h2>
        <Link to="/orders" className="mt-4 inline-block">
          <Button variant="outline">Back to orders</Button>
        </Link>
      </div>
    )
  }

  const config = statusConfig[order.status] ?? statusConfig.pending
  const StatusIcon = config.icon
  const currentStepIdx = statusSteps.indexOf(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded'

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
        <Badge className={`${config.color} flex items-center gap-1`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </Badge>
      </div>

      {!isCancelled && (
        <div className="mb-8 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => {
              const stepConf = statusConfig[step]
              const StepIcon = stepConf.icon
              const isActive = i <= currentStepIdx
              return (
                <div key={step} className="flex flex-1 flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isActive ? 'bg-teal-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <span className={`mt-1 text-xs ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                    {stepConf.label}
                  </span>
                  {i < statusSteps.length - 1 && (
                    <div className={`mt-1 h-0.5 w-full ${i < currentStepIdx ? 'bg-teal-600' : 'bg-muted'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 font-semibold">Items</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-muted-foreground">
                    ${Number(item.unit_price).toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <p className="font-medium">${Number(item.line_total).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${Number(order.discount).toFixed(2)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Order ID:</span> {order.id}</p>
              <p>
                <span className="text-muted-foreground">Date:</span>{' '}
                {new Date(order.created_at).toLocaleString()}
              </p>
              {order.shipping_name && (
                <p><span className="text-muted-foreground">Ship to:</span> {order.shipping_name}</p>
              )}
              {order.shipping_address && (
                <p><span className="text-muted-foreground">Address:</span> {order.shipping_address}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
