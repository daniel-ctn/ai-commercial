import { createFileRoute, Outlet, redirect, Link, useLocation } from '@tanstack/react-router'
import { userQueryOptions } from '#/lib/auth'
import { LayoutDashboard, Package, ShoppingBag, Tag } from 'lucide-react'

export const Route = createFileRoute('/shop-admin')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(userQueryOptions())
    if (!user || (user.role !== 'shop_admin' && user.role !== 'admin')) {
      throw redirect({ to: '/' })
    }
  },
  component: ShopAdminLayout,
})

const navItems = [
  { to: '/shop-admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/shop-admin/products', label: 'Products', icon: Package },
  { to: '/shop-admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/shop-admin/orders', label: 'Orders', icon: ShoppingBag },
]

function ShopAdminLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-[calc(100vh-73px)]">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Shop Admin
          </h2>
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
          {navItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
