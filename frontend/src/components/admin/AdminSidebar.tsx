import { Link } from '@tanstack/react-router'

const NAV_ITEMS = [
  {
    to: '/admin' as const,
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
    ),
  },
  {
    to: '/admin/users' as const,
    label: 'Users',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
  },
  {
    to: '/admin/shops' as const,
    label: 'Shops',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>
    ),
  },
  {
    to: '/admin/products' as const,
    label: 'Products',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
    ),
  },
  {
    to: '/admin/coupons' as const,
    label: 'Coupons',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
    ),
  },
]

export default function AdminSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-[var(--line)] bg-[var(--surface)] lg:block">
      <div className="sticky top-[73px] flex flex-col gap-1 p-4">
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
          Admin Panel
        </h3>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
            activeProps={{
              className:
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--sand)] text-[var(--sea-ink)] shadow-sm',
            }}
            activeOptions={{ exact: item.to === '/admin' }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}

export function AdminMobileNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2 lg:hidden">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--link-bg-hover)]"
          activeProps={{
            className:
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium bg-[var(--sand)] text-[var(--sea-ink)] shadow-sm',
          }}
          activeOptions={{ exact: item.to === '/admin' }}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
