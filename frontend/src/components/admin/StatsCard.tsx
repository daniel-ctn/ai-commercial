interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
}

export default function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--sea-ink-soft)]">{title}</p>
        <span className="text-[var(--lagoon-deep)]">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--sea-ink)]">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{subtitle}</p>
      )}
    </div>
  )
}
