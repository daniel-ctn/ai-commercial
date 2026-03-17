/**
 * API client — a thin wrapper around fetch() for calling the FastAPI backend.
 *
 * == Why a wrapper? (for Next.js devs) ==
 *
 * In Next.js, you might use `fetch('/api/...')` directly because your API
 * lives on the same server. Here, our frontend (port 3000) and backend
 * (port 8000) are on DIFFERENT servers, so every request needs:
 *
 *   1. The full backend URL prefix
 *   2. `credentials: 'include'` so cookies are sent cross-origin
 *   3. Proper Content-Type headers
 *   4. Auto-retry on 401 (when access token expires)
 *
 * This wrapper handles all of that in one place, so individual calls
 * are as clean as: `api.get('/products')` or `api.post('/auth/login', body)`.
 *
 * == credentials: 'include' ==
 *
 * By default, fetch() does NOT send cookies to a different origin.
 * `credentials: 'include'` tells the browser: "yes, send my cookies
 * even though this is a cross-origin request." This is how our httpOnly
 * auth cookies reach the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const REQUEST_TIMEOUT_MS = 30_000

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail)
    this.name = 'ApiError'
  }
}

let refreshPromise: Promise<boolean> | null = null

async function request<T>(
  endpoint: string,
  options: FetchOptions = {},
  _retried = false,
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options

  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {}),
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...rest,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  if (
    response.status === 401 &&
    !_retried &&
    !endpoint.includes('/auth/refresh')
  ) {
    const refreshed = await refreshToken()
    if (refreshed) {
      return request<T>(endpoint, options, true)
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new ApiError(response.status, error.detail || 'Request failed')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

async function refreshToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      return response.ok
    } catch {
      return false
    }
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

/**
 * The API client — use this throughout the app.
 *
 * Usage:
 *   const user = await api.get<User>('/auth/me')
 *   await api.post('/auth/login', { email, password })
 *   await api.post('/auth/logout')
 */
export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
}

export { ApiError }
