/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'ai-commercial:recently-viewed'

async function loadModule() {
  vi.resetModules()
  return import('#/lib/recently-viewed')
}

beforeEach(() => {
  localStorage.clear()
})

describe('recently viewed store', () => {
  it('ignores invalid localStorage payloads', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'p-1', name: 'Valid', price: 10, image_url: null, viewedAt: 1 },
        { id: 'p-2', name: 'Missing price', image_url: null, viewedAt: 2 },
        'bad-entry',
      ]),
    )

    const { useRecentlyViewed } = await loadModule()
    const { result } = renderHook(() => useRecentlyViewed())

    expect(result.current).toEqual([
      { id: 'p-1', name: 'Valid', price: 10, image_url: null, viewedAt: 1 },
    ])
  })

  it('keeps the newest view first and deduplicates products', async () => {
    const { clearRecentlyViewed, trackProductView, useRecentlyViewed } = await loadModule()
    const { result } = renderHook(() => useRecentlyViewed())

    act(() => {
      clearRecentlyViewed()
      trackProductView({ id: 'p-1', name: 'Phone', price: 100, image_url: null })
      trackProductView({ id: 'p-2', name: 'Tablet', price: 200, image_url: null })
      trackProductView({ id: 'p-1', name: 'Phone', price: 100, image_url: null })
    })

    expect(result.current).toHaveLength(2)
    expect(result.current[0]?.id).toBe('p-1')
    expect(result.current[1]?.id).toBe('p-2')
  })
})
