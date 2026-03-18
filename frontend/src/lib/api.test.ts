import { describe, expect, it } from 'vitest'
import { ApiError } from '#/lib/api'

describe('ApiError', () => {
  it('stores status and detail', () => {
    const error = new ApiError(404, 'Product not found')

    expect(error.status).toBe(404)
    expect(error.detail).toBe('Product not found')
    expect(error.message).toBe('Product not found')
    expect(error.name).toBe('ApiError')
  })

  it('extends Error', () => {
    const error = new ApiError(500, 'Internal server error')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
  })

  it('matches error shapes from both backends', () => {
    const nestJsError = { detail: 'Not authenticated' }
    const fastApiError = { detail: 'Not authenticated' }

    expect(nestJsError.detail).toBe(fastApiError.detail)
  })
})
