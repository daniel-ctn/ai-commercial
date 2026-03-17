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

import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '#/lib/api'

interface GoogleCallbackSearch {
  code?: string
  state?: string
  error?: string
  error_description?: string
}

export const Route = createFileRoute('/auth/google/callback')({
  validateSearch: (search: Record<string, unknown>): GoogleCallbackSearch => ({
    code: search.code as string | undefined,
    state: search.state as string | undefined,
    error: search.error as string | undefined,
    error_description: search.error_description as string | undefined,
  }),
  component: GoogleCallback,
})

function GoogleCallback() {
  const {
    code,
    state,
    error: oauthError,
    error_description: errorDescription,
  } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hasRun = useRef(false)
  const [error, setError] = useState<string | null>(
    oauthError ? errorDescription || 'Google sign-in was denied or failed.' : null,
  )

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    if (oauthError || !code || !state) {
      if (!oauthError) {
        setError(!code ? 'No authorization code received from Google.' : 'Missing OAuth state.')
      }
      return
    }

    api
      .post('/auth/google/callback', { code, state })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['auth'] })
        navigate({ to: '/', replace: true })
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message || 'Authentication failed. Please try again.')
        } else {
          setError('An unexpected error occurred. Please try again.')
        }
      })
  }, [code, errorDescription, oauthError, navigate, queryClient, state])

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
          <Link
            to="/auth/login"
            className="inline-block text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Back to login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-center space-y-2">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Signing in with Google...</p>
      </div>
    </main>
  )
}
