import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  shopAdminCouponsQueryOptions,
  useToggleShopAdminCouponActive,
} from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import AdminDataTable from '#/components/admin/AdminDataTable'
import type { AdminCoupon } from '#/lib/types'

export const Route = createFileRoute('/shop-admin/coupons')({
  component: ShopAdminCouponsPage,
})

function ShopAdminCouponsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery(shopAdminCouponsQueryOptions({ page, search: search || undefined }))
  const toggleActive = useToggleShopAdminCouponActive()

  return (
    <AdminDataTable<AdminCoupon>
      title="My Coupons"
      subtitle="Manage coupons for your shop"
      data={data?.items}
      isLoading={isLoading}
      getRowKey={(c) => c.id}
      page={page}
      totalPages={data?.pages ?? 0}
      total={data?.total ?? 0}
      search={search}
      onSearchChange={(v) => { setSearch(v); setPage(1) }}
      onPageChange={setPage}
      columns={[
        {
          key: 'code',
          header: 'Code',
          render: (c) => <span className="font-mono font-medium">{c.code}</span>,
        },
        {
          key: 'discount',
          header: 'Discount',
          render: (c) => (
            <span>
              {c.discount_type === 'percentage'
                ? `${c.discount_value}%`
                : `$${c.discount_value.toFixed(2)}`}
            </span>
          ),
        },
        {
          key: 'valid_until',
          header: 'Valid Until',
          render: (c) => {
            const date = new Date(c.valid_until)
            const now = new Date()
            const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            return (
              <div>
                <span className="text-sm">{date.toLocaleDateString()}</span>
                {daysLeft <= 3 && daysLeft > 0 && (
                  <span className="ml-2 text-xs font-medium text-amber-600">{daysLeft}d left</span>
                )}
                {daysLeft <= 0 && (
                  <span className="ml-2 text-xs font-medium text-red-600">Expired</span>
                )}
              </div>
            )
          },
          className: 'hidden md:table-cell',
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
            <Button
              variant={c.is_active ? 'outline' : 'default'}
              size="sm"
              onClick={() => toggleActive.mutate(c.id)}
              disabled={toggleActive.isPending}
            >
              {c.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          ),
          className: 'text-right',
        },
      ]}
    />
  )
}
