import { Link } from '@tanstack/react-router'
import { ArrowLeftRight, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useCompareList } from '#/lib/compare'

export default function CompareBar() {
  const { count, clear } = useCompareList()
  const canCompare = count >= 2

  if (count === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {count} product{count !== 1 && 's'} selected
        </span>
        {canCompare ? (
          <Link to="/compare">
            <Button size="sm">Compare</Button>
          </Link>
        ) : (
          <Button size="sm" disabled>
            Compare
          </Button>
        )}
        <button
          type="button"
          onClick={clear}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Clear comparison"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
