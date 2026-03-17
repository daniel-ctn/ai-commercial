import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import AdminSidebar, { AdminMobileNav } from '#/components/admin/AdminSidebar'
import { userQueryOptions } from '#/lib/auth'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(userQueryOptions())
    if (!user || user.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-73px)]">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminMobileNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
