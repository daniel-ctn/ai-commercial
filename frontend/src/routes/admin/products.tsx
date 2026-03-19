import { useCallback, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  adminProductsQueryOptions,
  useToggleProductActive,
  useDeleteProduct,
  useBulkToggleProducts,
  useBulkAssignCategory,
  useAiDescription,
  categoriesQueryOptions,
} from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import AdminDataTable from '#/components/admin/AdminDataTable'
import CreateProductForm from '#/components/admin/CreateProductForm'
import type { AdminProduct } from '#/lib/types'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/products')({
  component: AdminProductsPage,
})

function AdminProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkCategory, setShowBulkCategory] = useState(false)
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const { data, isLoading } = useQuery(adminProductsQueryOptions({ page, search: search || undefined }))
  const { data: categories } = useQuery(categoriesQueryOptions())
  const toggleActive = useToggleProductActive()
  const deleteProduct = useDeleteProduct()
  const bulkToggle = useBulkToggleProducts()
  const bulkCategory = useBulkAssignCategory()
  const aiDescription = useAiDescription()

  const mutationError = toggleActive.error || deleteProduct.error

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (!data?.items) return
    setSelectedIds((prev) => {
      if (prev.size === data.items.length) return new Set()
      return new Set(data.items.map((p) => p.id))
    })
  }, [data?.items])

  const handleBulkActivate = (activate: boolean) => {
    const ids = Array.from(selectedIds)
    bulkToggle.mutate({ ids, activate }, {
      onSuccess: () => setSelectedIds(new Set()),
    })
  }

  const handleBulkCategory = () => {
    if (!bulkCategoryId) return
    bulkCategory.mutate(
      { ids: Array.from(selectedIds), category_id: bulkCategoryId },
      { onSuccess: () => { setSelectedIds(new Set()); setShowBulkCategory(false); setBulkCategoryId('') } },
    )
  }

  const handleAiDescription = async (productId: string) => {
    const result = await aiDescription.mutateAsync(productId)
    if (result.description) {
      toast.success('AI description generated', { description: result.description.slice(0, 100) + '...' })
    }
  }

  return (
    <div>
      {mutationError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {mutationError instanceof Error ? mutationError.message : 'Action failed. Please try again.'}
        </div>
      )}
      {showCreate && <CreateProductForm onClose={() => setShowCreate(false)} />}

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selectedIds.size} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => handleBulkActivate(true)} disabled={bulkToggle.isPending}>
            Activate
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkActivate(false)} disabled={bulkToggle.isPending}>
            Deactivate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowBulkCategory(!showBulkCategory)}>
            Assign Category
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
          {showBulkCategory && (
            <div className="flex w-full items-center gap-2 pt-2">
              <select
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
              >
                <option value="">Select category...</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button size="sm" onClick={handleBulkCategory} disabled={!bulkCategoryId || bulkCategory.isPending}>
                Apply
              </Button>
            </div>
          )}
        </div>
      )}

      <AdminDataTable<AdminProduct>
        title="Products"
        subtitle="Manage all products across all shops"
        data={data?.items}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
        page={page}
        totalPages={data?.pages ?? 0}
        total={data?.total ?? 0}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        onPageChange={setPage}
        actions={
          !showCreate ? (
            <Button onClick={() => setShowCreate(true)}>
              + Create Product
            </Button>
          ) : null
        }
        columns={[
          {
            key: 'select',
            header: (
              <input
                type="checkbox"
                checked={data?.items ? selectedIds.size === data.items.length && data.items.length > 0 : false}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-300"
              />
            ),
            render: (p) => (
              <input
                type="checkbox"
                checked={selectedIds.has(p.id)}
                onChange={() => toggleSelection(p.id)}
                className="h-4 w-4 rounded border-gray-300"
              />
            ),
          },
          {
            key: 'name',
            header: 'Product',
            render: (p) => (
              <div className="flex items-center gap-3">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sand)] text-xs text-[var(--sea-ink-soft)]">
                    N/A
                  </div>
                )}
                <div>
                  <span className="font-medium text-[var(--sea-ink)]">{p.name}</span>
                  {p.category_name && (
                    <span className="mt-0.5 block text-xs text-[var(--sea-ink-soft)]">
                      {p.category_name}
                    </span>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'shop',
            header: 'Shop',
            render: (p) => p.shop_name ?? '—',
            className: 'hidden md:table-cell',
          },
          {
            key: 'price',
            header: 'Price',
            render: (p) => (
              <div>
                <span className="font-medium">${p.price.toFixed(2)}</span>
                {p.original_price && p.original_price > p.price && (
                  <span className="ml-1.5 text-xs text-[var(--sea-ink-soft)] line-through">
                    ${p.original_price.toFixed(2)}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (p) => (
              <Badge variant={p.is_active ? 'default' : 'secondary'}>
                {p.is_active ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: '',
            render: (p) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Generate AI description"
                  onClick={() => handleAiDescription(p.id)}
                  disabled={aiDescription.isPending}
                >
                  {aiDescription.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
                <Button
                  variant={p.is_active ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => toggleActive.mutate(p.id)}
                  disabled={toggleActive.isPending}
                >
                  {p.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    if (confirm('Delete this product?')) deleteProduct.mutate(p.id)
                  }}
                  disabled={deleteProduct.isPending}
                >
                  Delete
                </Button>
              </div>
            ),
            className: 'text-right',
          },
        ]}
      />
    </div>
  )
}
