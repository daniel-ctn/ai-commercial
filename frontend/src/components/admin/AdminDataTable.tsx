import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'

interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  className?: string
}

interface AdminDataTableProps<T> {
  columns: Column<T>[]
  data: T[] | undefined
  isLoading: boolean
  page: number
  totalPages: number
  total: number
  search: string
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function AdminDataTable<T>({
  columns,
  data,
  isLoading,
  page,
  totalPages,
  total,
  search,
  onSearchChange,
  onPageChange,
  title,
  subtitle,
  actions,
}: AdminDataTableProps<T>) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--sea-ink)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-[var(--sea-ink-soft)]">
          {total} total
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-strong)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--line)]">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data && data.length > 0 ? (
                data.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--surface)]"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.className || ''}`}
                      >
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-[var(--sea-ink-soft)]"
                  >
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
