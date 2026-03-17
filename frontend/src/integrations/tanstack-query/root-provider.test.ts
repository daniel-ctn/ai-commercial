import { describe, expect, it } from 'vitest'
import { ApiError } from '#/lib/api'
import { createQueryClient } from './root-provider'

type RetryFn = (failureCount: number, error: unknown) => boolean

describe('createQueryClient', () => {
  it('does not retry auth and not-found errors', () => {
    const queryClient = createQueryClient()
    const retry = queryClient.getDefaultOptions().queries?.retry as RetryFn

    expect(retry(0, new ApiError(401, 'Unauthorized'))).toBe(false)
    expect(retry(0, new ApiError(403, 'Forbidden'))).toBe(false)
    expect(retry(0, new ApiError(404, 'Not found'))).toBe(false)
  })

  it('retries transient errors at most twice', () => {
    const queryClient = createQueryClient()
    const retry = queryClient.getDefaultOptions().queries?.retry as RetryFn

    expect(retry(0, new Error('temporary issue'))).toBe(true)
    expect(retry(1, new Error('temporary issue'))).toBe(true)
    expect(retry(2, new Error('temporary issue'))).toBe(false)
  })

  it('disables mutation retries by default', () => {
    const queryClient = createQueryClient()

    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false)
  })
})
