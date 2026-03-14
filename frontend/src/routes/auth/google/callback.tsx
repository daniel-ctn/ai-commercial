/**
 * Google OAuth callback page — /auth/google/callback
 *
 * == How OAuth callbacks work ==
 *
 * After the user signs in with Google, Google redirects back to this page
 * with a `code` query parameter in the URL:
 *
 *   /auth/google/callback?code=4/0AfJohXm...
 *
 * This page:
 * 1. Reads the `code` from the URL
 * 2. Sends it to our backend (POST /auth/google/callback)
 * 3. Backend exchanges it with Google for user info
 * 4. Backend sets auth cookies and returns user data
 * 5. We redirect to the home page
 *
 * == TanStack Router Search Params ==
 *
 * In Next.js, you'd use `useSearchParams()` to read query params.
 * In TanStack Router, you validate them in `validateSearch` and
 * access them type-safely with `Route.useSearch()`.
 */

import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '#/lib/api'

interface GoogleCallbackSearch {
  code?: string
}

export const Route = createFileRoute('/auth/google/callback')({
  validateSearch: (search: Record<string, unknown>): GoogleCallbackSearch => ({
    code: search.code as string | undefined,
  }),
  component: GoogleCallback,
})

function GoogleCallback() {
  const { code } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hasRun = useRef(false)

  useEffect(() => {
    // Prevent double-execution in React Strict Mode
    if (hasRun.current) return
    hasRun.current = true

    if (!code) {
      navigate({ to: '/auth/login' })
      return
    }

    api
      .post('/auth/google/callback', { code })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['auth'] })
        navigate({ to: '/' })
      })
      .catch(() => {
        navigate({ to: '/auth/login' })
      })
  }, [code, navigate, queryClient])

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <p className="text-muted-foreground">Signing in with Google...</p>
    </main>
  )
}
