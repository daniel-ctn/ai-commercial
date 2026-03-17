import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { adminCouponsQueryOptions, useToggleCouponActive, useDeleteCoupon } from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import AdminDataTable from '#/components/admin/AdminDataTable'
import CreateCouponForm from '#/components/admin/CreateCouponForm'
import type { AdminCoupon } from '#/lib/types'

export const Route = createFileRoute('/admin/coupons')({
  component: AdminCouponsPage,
})

function AdminCouponsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useQuery(adminCouponsQueryOptions({ page, search: search || undefined }))
  const toggleActive = useToggleCouponActive()
  const deleteCoupon = useDeleteCoupon()

  const formatDiscount = (coupon: AdminCoupon) =>
    coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}%`
      : `$${coupon.discount_value.toFixed(2)}`

  const isExpired = (coupon: AdminCoupon) =>
    new Date(coupon.valid_until) < new Date()

  const mutationError = toggleActive.error || deleteCoupon.error

  return (
    <div>
      {mutationError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {mutationError instanceof Error ? mutationError.message : 'Action failed. Please try again.'}
        </div>
      )}
      {showCreate && <CreateCouponForm onClose={() => setShowCreate(false)} />}
      <AdminDataTable<AdminCoupon>
        title="Coupons"
        subtitle="Manage all coupons and promotions"
        data={data?.items}
        isLoading={isLoading}
        getRowKey={(c) => c.id}
        page={page}
        totalPages={data?.pages ?? 0}
        total={data?.total ?? 0}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        onPageChange={setPage}
        actions={
          !showCreate ? (
            <Button onClick={() => setShowCreate(true)}>
              + Create Coupon
            </Button>
          ) : null
        }
        columns={[
          {
            key: 'code',
            header: 'Code',
            render: (c) => (
              <span className="rounded bg-[var(--sand)] px-2 py-0.5 font-mono text-sm font-semibold text-[var(--sea-ink)]">
                {c.code}
              </span>
            ),
          },
          {
            key: 'discount',
            header: 'Discount',
            render: (c) => (
              <span className="font-medium text-[var(--palm)]">
                {formatDiscount(c)} off
              </span>
            ),
          },
          {
            key: 'shop',
            header: 'Shop',
            render: (c) => c.shop_name ?? '—',
            className: 'hidden md:table-cell',
          },
          {
            key: 'validity',
            header: 'Valid Until',
            render: (c) => (
              <div>
                <span className={isExpired(c) ? 'text-red-500' : ''}>
                  {new Date(c.valid_until).toLocaleDateString()}
                </span>
                {isExpired(c) && (
                  <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Expired
                  </Badge>
                )}
              </div>
            ),
            className: 'hidden sm:table-cell',
          },
          {
            key: 'status',
            header: 'Status',
            render: (c) => (
              <Badge variant={c.is_active ? 'default' : 'secondary'}>
                {c.is_active ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: '',
            render: (c) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant={c.is_active ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => toggleActive.mutate(c.id)}
                  disabled={toggleActive.isPending}
                >
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    if (confirm('Delete this coupon?')) deleteCoupon.mutate(c.id)
                  }}
                  disabled={deleteCoupon.isPending}
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
