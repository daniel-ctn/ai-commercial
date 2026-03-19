import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { shopAdminStatsQueryOptions } from '#/lib/queries'
import StatsCard from '#/components/admin/StatsCard'
import { Skeleton } from '#/components/ui/skeleton'
import { Package, Tag, AlertTriangle, ImageOff, FileText } from 'lucide-react'
import { ApiError } from '#/lib/api'

export const Route = createFileRoute('/shop-admin/')({
  component: ShopAdminDashboard,
})

function ShopAdminDashboard() {
  const { data: stats, isLoading, error } = useQuery(shopAdminStatsQueryOptions())

  if (error) {
    const needsShop = error instanceof ApiError && error.status === 403

    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-amber-500" />
        <p className="font-medium text-amber-800 dark:text-amber-200">
          {needsShop
            ? 'You need to create a shop first before accessing this dashboard.'
            : 'Unable to load your shop dashboard right now.'}
        </p>
        {needsShop ? (
          <Link to="/shops" className="mt-2 inline-block text-sm text-primary underline">
            Go to Shops
          </Link>
        ) : (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Please try again in a moment.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--sea-ink)]">
          {stats?.shop_name ?? 'My Shop'}
        </h1>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Your shop dashboard and inventory overview
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="Total Products"
              value={stats.total_products}
              subtitle={`${stats.active_products} active`}
              icon={<Package className="h-5 w-5" />}
            />
            <StatsCard
              title="Inactive Products"
              value={stats.total_products - stats.active_products}
              icon={<Package className="h-5 w-5" />}
            />
            <StatsCard
              title="Total Coupons"
              value={stats.total_coupons}
              subtitle={`${stats.active_coupons} active`}
              icon={<Tag className="h-5 w-5" />}
            />
            <StatsCard
              title="Quality Score"
              value={`${stats.data_quality?.quality_score ?? 0}%`}
              subtitle={stats.data_quality?.quality_score === 100 ? 'Excellent' : 'Needs improvement'}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              }
            />
          </div>

          {stats.data_quality && (stats.data_quality.missing_images > 0 || stats.data_quality.missing_descriptions > 0) && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
                Data Quality Issues
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {stats.data_quality.missing_images > 0 && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                    <ImageOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        {stats.data_quality.missing_images} product{stats.data_quality.missing_images > 1 ? 's' : ''} missing images
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        Products with images get significantly more clicks.
                      </p>
                      <Link to="/shop-admin/products" className="mt-2 inline-block text-sm font-medium text-primary underline">
                        View Products
                      </Link>
                    </div>
                  </div>
                )}
                {stats.data_quality.missing_descriptions > 0 && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        {stats.data_quality.missing_descriptions} product{stats.data_quality.missing_descriptions > 1 ? 's' : ''} missing descriptions
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        Detailed descriptions help customers make purchase decisions.
                      </p>
                      <Link to="/shop-admin/products" className="mt-2 inline-block text-sm font-medium text-primary underline">
                        View Products
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
