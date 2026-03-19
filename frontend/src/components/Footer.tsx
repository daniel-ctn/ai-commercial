import { Link } from '@tanstack/react-router'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">AI Commercial</p>
            <p className="m-0 mt-1 text-xs">Smart shopping, better deals.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/products" className="hover:text-[var(--sea-ink)]">Products</Link>
            <Link to="/shops" className="hover:text-[var(--sea-ink)]">Shops</Link>
            <Link to="/deals" className="hover:text-[var(--sea-ink)]">Deals</Link>
            <Link to="/compare" className="hover:text-[var(--sea-ink)]">Compare</Link>
            <Link to="/about" className="hover:text-[var(--sea-ink)]">About</Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-[var(--line)] pt-6 text-center text-xs">
          <p className="m-0">&copy; {year} AI Commercial. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
