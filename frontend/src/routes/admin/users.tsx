import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { adminUsersQueryOptions, useUpdateUserRole } from '#/lib/queries'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import AdminDataTable from '#/components/admin/AdminDataTable'
import type { AdminUser } from '#/lib/types'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
})

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  shop_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery(adminUsersQueryOptions({ page, search: search || undefined }))
  const updateRole = useUpdateUserRole()

  const handleRoleChange = (userId: string, currentRole: string) => {
    const roles = ['user', 'shop_admin', 'admin']
    const nextIndex = (roles.indexOf(currentRole) + 1) % roles.length
    updateRole.mutate({ userId, role: roles[nextIndex] })
  }

  return (
    <div>
      {updateRole.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {updateRole.error instanceof Error ? updateRole.error.message : 'Failed to update role. Please try again.'}
        </div>
      )}
    <AdminDataTable<AdminUser>
      title="Users"
      subtitle="Manage platform users and their roles"
      data={data?.items}
      isLoading={isLoading}
      getRowKey={(u) => u.id}
      page={page}
      totalPages={data?.pages ?? 0}
      total={data?.total ?? 0}
      search={search}
      onSearchChange={(v) => { setSearch(v); setPage(1) }}
      onPageChange={setPage}
      columns={[
        {
          key: 'name',
          header: 'Name',
          render: (u) => (
            <span className="font-medium text-[var(--sea-ink)]">{u.name}</span>
          ),
        },
        {
          key: 'email',
          header: 'Email',
          render: (u) => u.email,
        },
        {
          key: 'role',
          header: 'Role',
          render: (u) => (
            <Badge className={ROLE_COLORS[u.role] || ''} variant="secondary">
              {u.role}
            </Badge>
          ),
        },
        {
          key: 'provider',
          header: 'Provider',
          render: (u) => u.oauth_provider ?? 'email',
          className: 'hidden md:table-cell',
        },
        {
          key: 'created',
          header: 'Joined',
          render: (u) =>
            new Date(u.created_at).toLocaleDateString(),
          className: 'hidden sm:table-cell',
        },
        {
          key: 'actions',
          header: '',
          render: (u) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRoleChange(u.id, u.role)}
              disabled={updateRole.isPending}
            >
              Change role
            </Button>
          ),
          className: 'text-right',
        },
      ]}
    />
    </div>
  )
}
