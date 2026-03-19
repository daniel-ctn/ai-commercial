import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'
import { useAuth } from '#/lib/auth'

export default function Header() {
  const { user } = useAuth()
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            AI Commercial
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
            activeOptions={{ exact: true }}
          >
            Home
          </Link>
          <Link
            to="/products"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Products
          </Link>
          <Link
            to="/shops"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Shops
          </Link>
          <Link
            to="/deals"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Deals
          </Link>
          <Link
            to="/compare"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Compare
          </Link>
          {(user?.role === 'shop_admin' || user?.role === 'admin') && (
            <Link
              to="/shop-admin"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              My Shop
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Admin
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
