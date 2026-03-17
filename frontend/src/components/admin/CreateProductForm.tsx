import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useCreateProduct, adminShopsQueryOptions } from '#/lib/queries'
import { categoriesQueryOptions } from '#/lib/queries'

interface CreateProductFormProps {
  onClose: () => void
}

export default function CreateProductForm({ onClose }: CreateProductFormProps) {
  const { data: shopsData } = useQuery(adminShopsQueryOptions({ page_size: 100 }))
  const { data: categories } = useQuery(categoriesQueryOptions(true))
  const createProduct = useCreateProduct()

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    image_url: '',
    shop_id: '',
    category_id: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createProduct.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : undefined,
        image_url: form.image_url || undefined,
        shop_id: form.shop_id,
        category_id: form.category_id,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
          Create Product
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="price">Price *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="original_price">Original Price</Label>
          <Input
            id="original_price"
            type="number"
            step="0.01"
            value={form.original_price}
            onChange={(e) => setForm({ ...form, original_price: e.target.value })}
            placeholder="Leave empty if not on sale"
          />
        </div>
        <div>
          <Label htmlFor="image_url">Image URL</Label>
          <Input
            id="image_url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
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
          <Label htmlFor="category_id">Category *</Label>
          <select
            id="category_id"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select a category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="sm:col-span-2">
          {createProduct.isError && (
            <p className="mb-2 text-sm text-red-600">
              {(createProduct.error as Error).message}
            </p>
          )}
          <Button type="submit" disabled={createProduct.isPending}>
            {createProduct.isPending ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
