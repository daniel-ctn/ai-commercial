import { useCallback, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  shopAdminProductsQueryOptions,
  useBulkToggleShopAdminProducts,
  useToggleShopAdminProductActive,
} from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import AdminDataTable from '#/components/admin/AdminDataTable'
import type { AdminProduct } from '#/lib/types'
import { toast } from 'sonner'

export const Route = createFileRoute('/shop-admin/products')({
  component: ShopAdminProductsPage,
})

function ShopAdminProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { data, isLoading } = useQuery(shopAdminProductsQueryOptions({ page, search: search || undefined }))
  const toggleActive = useToggleShopAdminProductActive()
  const bulkToggle = useBulkToggleShopAdminProducts()

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

  const handleBulkToggle = async (activate: boolean) => {
    if (selectedIds.size === 0) {
      return
    }

    try {
      await bulkToggle.mutateAsync({
        ids: Array.from(selectedIds),
        activate,
      })
      setSelectedIds(new Set())
    } catch {
      toast.error('Bulk action failed')
    }
  }

  return (
    <div>
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkToggle(true)}
            disabled={bulkToggle.isPending}
          >
            Activate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkToggle(false)}
            disabled={bulkToggle.isPending}
          >
            Deactivate
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <AdminDataTable<AdminProduct>
        title="My Products"
        subtitle="Manage products in your shop"
        data={data?.items}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
        page={page}
        totalPages={data?.pages ?? 0}
        total={data?.total ?? 0}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        onPageChange={setPage}
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
                  <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    N/A
                  </div>
                )}
                <div>
                  <span className="font-medium">{p.name}</span>
                  {p.category_name && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{p.category_name}</span>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'price',
            header: 'Price',
            render: (p) => (
              <div>
                <span className="font-medium">${p.price.toFixed(2)}</span>
                {p.original_price && p.original_price > p.price && (
                  <span className="ml-1.5 text-xs text-muted-foreground line-through">
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
              <Button
                variant={p.is_active ? 'outline' : 'default'}
                size="sm"
                onClick={() => toggleActive.mutate(p.id)}
                disabled={toggleActive.isPending}
              >
                {p.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            ),
            className: 'text-right',
          },
        ]}
      />
    </div>
  )
}
