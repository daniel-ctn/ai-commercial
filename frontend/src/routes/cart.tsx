import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  cartQueryOptions,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
  useCheckout,
} from '#/lib/queries'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, Tag } from 'lucide-react'

export const Route = createFileRoute('/cart')({
  head: () => ({
    meta: [
      { title: 'Shopping Cart | AI Commercial' },
      { name: 'description', content: 'Review your cart and proceed to checkout.' },
    ],
  }),
  component: CartPage,
})

function CartPage() {
  const { data: cart, isLoading, isError } = useQuery(cartQueryOptions())
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const clearCart = useClearCart()
  const checkout = useCheckout()

  const [couponCode, setCouponCode] = useState('')
  const [shippingName, setShippingName] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-24 rounded bg-muted" />
          <div className="h-24 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Sign in to view your cart</h2>
        <p className="mt-2 text-muted-foreground">You need to be logged in to use the cart.</p>
        <Link to="/auth/login" className="mt-4 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">Browse products and add items to get started.</p>
        <Link to="/products" className="mt-4 inline-block">
          <Button>Browse products</Button>
        </Link>
      </div>
    )
  }

  const handleCheckout = () => {
    checkout.mutate({
      coupon_code: couponCode || undefined,
      shipping_name: shippingName || undefined,
      shipping_address: shippingAddress || undefined,
    })
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shopping Cart ({cart.item_count} items)</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearCart.mutate()}
          disabled={clearCart.isPending}
        >
          Clear cart
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-lg border bg-card p-4"
            >
              {item.product_image ? (
                <img
                  src={item.product_image}
                  alt={item.product_name}
                  className="h-20 w-20 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                  No image
                </div>
              )}

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    to="/products/$productId"
                    params={{ productId: item.product_id }}
                    className="font-medium hover:underline"
                  >
                    {item.product_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{item.shop_name}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-md border">
                    <button
                      className="px-2 py-1 hover:bg-muted disabled:opacity-50"
                      onClick={() =>
                        item.quantity > 1 &&
                        updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                      }
                      disabled={item.quantity <= 1 || updateItem.isPending}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[2rem] px-2 text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      className="px-2 py-1 hover:bg-muted disabled:opacity-50"
                      onClick={() =>
                        updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                      }
                      disabled={updateItem.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem.mutate(item.id)}
                    disabled={removeItem.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold">${item.line_total.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  ${item.unit_price.toFixed(2)} each
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold">Order Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${cart.discount.toFixed(2)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Coupon Code</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="text-sm"
              />
              <Tag className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Shipping Info (optional)</h3>
            <div className="space-y-2">
              <Input
                placeholder="Full name"
                value={shippingName}
                onChange={(e) => setShippingName(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={checkout.isPending}
          >
            {checkout.isPending ? 'Processing...' : 'Proceed to Checkout'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {checkout.isError && (
            <p className="text-center text-sm text-destructive">
              {(checkout.error as any)?.detail || 'Checkout failed. Please try again.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
