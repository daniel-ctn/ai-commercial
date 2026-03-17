import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

let browserQueryClient: QueryClient | undefined

export function createQueryClient() {
  return new QueryClient({
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
