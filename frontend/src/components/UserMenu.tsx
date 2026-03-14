/**
 * UserMenu component — shows login/register links or user dropdown.
 *
 * This component conditionally renders based on auth state:
 *   - Not logged in → "Sign in" and "Sign up" links
 *   - Logged in → User's name with a logout button
 *
 * It uses the `useAuth` hook which is backed by TanStack Query,
 * so it automatically stays in sync across the whole app. When
 * you log in on the login page, this component updates instantly
 * because the query cache is invalidated.
 */

import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { useAuth, useLogout } from '#/lib/auth'

export default function UserMenu() {
  const { user, isLoading } = useAuth()
  const logout = useLogout()

  if (isLoading) {
    return (
      <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/auth/login">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link to="/auth/register">
          <Button size="sm">Sign up</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium sm:inline">
        {user.name}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        {logout.isPending ? 'Signing out...' : 'Sign out'}
      </Button>
    </div>
  )
}
