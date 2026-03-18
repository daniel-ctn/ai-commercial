import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '#/lib/api'

let browserQueryClient: QueryClient | undefined

function handleError(error: Error) {
  // Ignore 401s and 404s for global toasts to avoid noise
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 404) return
    toast.error('An error occurred', {
      description: error.detail || error.message,
    })
  } else {
    toast.error('An unexpected error occurred', {
      description: error.message,
    })
  }
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleError,
    }),
    mutationCache: new MutationCache({
      onError: handleError,
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof Error && 'status' in error) {
            const status = (error as { status: number }).status
            if (status === 401 || status === 403 || status === 404) return false
          }
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function getContext() {
  if (typeof window === 'undefined') {
    return {
      queryClient: createQueryClient(),
    }
  }

  browserQueryClient ??= createQueryClient()

  return {
    queryClient: browserQueryClient,
  }
}

export default function TanStackQueryProvider({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
