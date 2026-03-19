import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { adminStatsQueryOptions } from '#/lib/queries'
import StatsCard from '#/components/admin/StatsCard'
import { Skeleton } from '#/components/ui/skeleton'
import { ImageOff, FileText, Database } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery(adminStatsQueryOptions())

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--sea-ink)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Platform overview and key metrics
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="Total Users"
              value={stats.total_users}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              }
            />
            <StatsCard
              title="Total Shops"
              value={stats.total_shops}
              subtitle={`${stats.active_shops} active`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
              }
            />
            <StatsCard
              title="Total Products"
              value={stats.total_products}
              subtitle={`${stats.active_products} active`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
              }
            />
            <StatsCard
              title="Total Coupons"
              value={stats.total_coupons}
              subtitle={`${stats.active_coupons} active`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
              }
            />
            <StatsCard
              title="Categories"
              value={stats.total_categories}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
              }
            />
            <StatsCard
              title="Active Shops"
              value={stats.active_shops}
              subtitle={`${stats.total_shops - stats.active_shops} inactive`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              }
            />
            <StatsCard
              title="Active Products"
              value={stats.active_products}
              subtitle={`${stats.total_products - stats.active_products} inactive`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              }
            />
            <StatsCard
              title="Active Coupons"
              value={stats.active_coupons}
              subtitle={`${stats.total_coupons - stats.active_coupons} inactive`}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              }
            />
          </div>

          {stats.data_quality && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
                Data Quality
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                    <ImageOff className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--sea-ink)]">{stats.data_quality.missing_images}</p>
                    <p className="text-sm text-muted-foreground">Products missing images</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--sea-ink)]">{stats.data_quality.missing_descriptions}</p>
                    <p className="text-sm text-muted-foreground">Products missing descriptions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--sea-ink)]">{stats.data_quality.missing_attributes}</p>
                    <p className="text-sm text-muted-foreground">Products missing attributes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {stats.products_by_category && stats.products_by_category.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
                Products by Category
              </h2>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="space-y-3">
                  {stats.products_by_category.map((item) => {
                    const maxCount = stats.products_by_category![0].count
                    const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    return (
                      <div key={item.category ?? 'uncategorized'} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-sm text-muted-foreground">
                          {item.category ?? 'Uncategorized'}
                        </span>
                        <div className="flex-1">
                          <div className="h-6 overflow-hidden rounded-full bg-muted">
                            <div
                              className="flex h-full items-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground"
                              style={{ width: `${Math.max(pct, 8)}%` }}
                            >
                              {item.count}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
