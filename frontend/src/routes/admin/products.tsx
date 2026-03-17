import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { adminProductsQueryOptions, useToggleProductActive, useDeleteProduct } from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import AdminDataTable from '#/components/admin/AdminDataTable'
import CreateProductForm from '#/components/admin/CreateProductForm'
import type { AdminProduct } from '#/lib/types'

export const Route = createFileRoute('/admin/products')({
  component: AdminProductsPage,
})

function AdminProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useQuery(adminProductsQueryOptions({ page, search: search || undefined }))
  const toggleActive = useToggleProductActive()
  const deleteProduct = useDeleteProduct()

  const mutationError = toggleActive.error || deleteProduct.error

  return (
    <div>
      {mutationError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {mutationError instanceof Error ? mutationError.message : 'Action failed. Please try again.'}
        </div>
      )}
      {showCreate && <CreateProductForm onClose={() => setShowCreate(false)} />}
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
