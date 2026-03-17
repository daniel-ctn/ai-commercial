import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useCreateCoupon, adminShopsQueryOptions } from '#/lib/queries'

interface CreateCouponFormProps {
  onClose: () => void
}

export default function CreateCouponForm({ onClose }: CreateCouponFormProps) {
  const { data: shopsData } = useQuery(adminShopsQueryOptions({ page_size: 100 }))
  const createCoupon = useCreateCoupon()

  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    shop_id: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createCoupon.mutate(
      {
        code: form.code,
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : undefined,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
        shop_id: form.shop_id,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
          Create Coupon
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Coupon Code *</Label>
          <Input
            id="code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="e.g. SAVE20"
            required
          />
        </div>
        <div>
          <Label htmlFor="shop_id">Shop *</Label>
          <select
            id="shop_id"
            value={form.shop_id}
            onChange={(e) => setForm({ ...form, shop_id: e.target.value })}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select a shop</option>
            {shopsData?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="discount_type">Discount Type *</Label>
          <select
            id="discount_type"
            value={form.discount_type}
            onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>
        <div>
          <Label htmlFor="discount_value">
            Discount Value * ({form.discount_type === 'percentage' ? '%' : '$'})
          </Label>
          <Input
            id="discount_value"
            type="number"
            step="0.01"
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="min_purchase">Minimum Purchase</Label>
          <Input
            id="min_purchase"
            type="number"
            step="0.01"
            value={form.min_purchase}
            onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="valid_from">Valid From *</Label>
          <Input
            id="valid_from"
            type="date"
            value={form.valid_from}
            onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="valid_until">Valid Until *</Label>
          <Input
            id="valid_until"
            type="date"
            value={form.valid_until}
            onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="sm:col-span-2">
          {createCoupon.isError && (
            <p className="mb-2 text-sm text-red-600">
              {(createCoupon.error as Error).message}
            </p>
          )}
          <Button type="submit" disabled={createCoupon.isPending}>
            {createCoupon.isPending ? 'Creating...' : 'Create Coupon'}
          </Button>
        </div>
      </form>
    </div>
  )
}
