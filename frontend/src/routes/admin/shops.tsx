import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { adminShopsQueryOptions, useToggleShopActive } from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import AdminDataTable from '#/components/admin/AdminDataTable'
import type { AdminShop } from '#/lib/types'

export const Route = createFileRoute('/admin/shops')({
  component: AdminShopsPage,
})

function AdminShopsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery(adminShopsQueryOptions({ page, search: search || undefined }))
  const toggleActive = useToggleShopActive()

  return (
    <AdminDataTable<AdminShop>
      title="Shops"
      subtitle="Manage all shops on the platform"
      data={data?.items}
      isLoading={isLoading}
      page={page}
      totalPages={data?.pages ?? 0}
      total={data?.total ?? 0}
      search={search}
      onSearchChange={(v) => { setSearch(v); setPage(1) }}
      onPageChange={setPage}
      columns={[
        {
          key: 'name',
          header: 'Shop Name',
          render: (s) => (
            <div>
              <span className="font-medium text-[var(--sea-ink)]">{s.name}</span>
              {s.website && (
                <a
                  href={s.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block text-xs text-[var(--lagoon-deep)] hover:underline"
                >
                  {s.website}
                </a>
              )}
            </div>
          ),
        },
        {
          key: 'owner',
          header: 'Owner',
          render: (s) => (
            <div>
              <span className="text-[var(--sea-ink)]">{s.owner_name ?? '—'}</span>
              {s.owner_email && (
                <span className="mt-0.5 block text-xs text-[var(--sea-ink-soft)]">
                  {s.owner_email}
                </span>
              )}
            </div>
          ),
          className: 'hidden md:table-cell',
        },
        {
          key: 'status',
          header: 'Status',
          render: (s) => (
            <Badge variant={s.is_active ? 'default' : 'secondary'}>
              {s.is_active ? 'Active' : 'Inactive'}
            </Badge>
          ),
        },
        {
          key: 'created',
          header: 'Created',
          render: (s) => new Date(s.created_at).toLocaleDateString(),
          className: 'hidden sm:table-cell',
        },
        {
          key: 'actions',
          header: '',
          render: (s) => (
            <Button
              variant={s.is_active ? 'outline' : 'default'}
              size="sm"
              onClick={() => toggleActive.mutate(s.id)}
              disabled={toggleActive.isPending}
            >
              {s.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          ),
          className: 'text-right',
        },
      ]}
    />
  )
}
