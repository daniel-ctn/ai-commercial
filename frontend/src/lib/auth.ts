/**
 * Auth types and TanStack Query hooks for authentication.
 *
 * == TanStack Query vs Next.js data fetching ==
 *
 * In Next.js App Router, you fetch data in Server Components:
 *     const user = await fetch('/api/auth/me')
 *
 * In TanStack Start, we use TanStack Query (React Query) which gives us:
 *   - Automatic caching (don't re-fetch if data is fresh)
 *   - Background refetching (keep data up-to-date)
 *   - Loading/error states (no manual useState needed)
 *   - Optimistic updates
 *   - Automatic retry on failure
 *
 * The two key concepts:
 *
 * 1. `useQuery` — for GET requests (reading data)
 *    Like `useSWR` or Next.js `fetch` in server components.
 *    It caches the result under a "query key" (like ['auth', 'me']).
 *
 * 2. `useMutation` — for POST/PUT/DELETE requests (writing data)
 *    Doesn't cache. Provides `mutate()` function + loading/error states.
 *    After success, we "invalidate" related queries to refetch fresh data.
 *
 * == queryOptions pattern ==
 *
 * `queryOptions()` is a helper that pre-defines a query configuration
 * (key + fetch function) so you can reuse it in multiple places:
 *   - In components: `useQuery(userQueryOptions())`
 *   - In route loaders: `queryClient.ensureQueryData(userQueryOptions())`
 *   - In other hooks: `queryClient.invalidateQueries({ queryKey: ['auth'] })`
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { api, ApiError } from '#/lib/api'

// ── Types ────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'shop_admin' | 'admin'
  oauth_provider: string | null
  created_at: string
}

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  name: string
}

// ── Query Options ────────────────────────────────────────────────

/**
 * Query configuration for fetching the current user.
 *
 * `retry: false` — don't retry on 401 (user is just not logged in)
 * `staleTime: 5 min` — don't re-fetch for 5 minutes (user data rarely changes)
 */
export const userQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await api.get<User>('/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null
        }
        throw error
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

// ── Hooks ────────────────────────────────────────────────────────

/**
 * Get the current authenticated user (or null if not logged in).
 *
 * Usage:
 *   const { user, isLoading } = useAuth()
 *   if (isLoading) return <Spinner />
 *   if (!user) return <LoginPage />
 */
export function useAuth() {
  const query = useQuery(userQueryOptions())

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

/**
 * Login mutation — call `login({ email, password })`.
 *
 * == What is a mutation? ==
 *
 * In TanStack Query, "mutation" = any action that changes data on the server
 * (POST, PUT, DELETE). It's like a form submission with built-in states:
 *
 *   const { mutate, isPending, isError, error } = useLogin()
 *   mutate({ email, password })  // fires the request
 *
 * After a successful login:
 * - We invalidate the ['auth'] queries → triggers refetch of user data
 * - Navigate to the home page
 */
export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: LoginData) => api.post<User>('/auth/login', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      router.navigate({ to: '/' })
    },
  })
}

/**
 * Register mutation — creates a new account and auto-logs in.
 */
export function useRegister() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: RegisterData) => api.post<User>('/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      router.navigate({ to: '/' })
    },
  })
}

/**
 * Logout mutation — clears cookies and cached user data.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      // Clear all cached auth data
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      router.navigate({ to: '/' })
    },
  })
}
