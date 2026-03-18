import { describe, expect, it, beforeEach } from 'vitest'
import {
  addToCompare,
  removeFromCompare,
  toggleCompare,
  clearCompare,
  isInCompare,
} from '#/lib/compare'

beforeEach(() => {
  clearCompare()
})

describe('compare store', () => {
  it('adds a product to the compare list', () => {
    addToCompare('p-1')
    expect(isInCompare('p-1')).toBe(true)
  })

  it('does not add duplicates', () => {
    addToCompare('p-1')
    addToCompare('p-1')
    clearCompare()
    expect(isInCompare('p-1')).toBe(false)
  })

  it('removes a product from the compare list', () => {
    addToCompare('p-1')
    removeFromCompare('p-1')
    expect(isInCompare('p-1')).toBe(false)
  })

  it('remove is a no-op for non-existent product', () => {
    addToCompare('p-1')
    removeFromCompare('p-2')
    expect(isInCompare('p-1')).toBe(true)
  })

  it('toggleCompare adds when not present', () => {
    toggleCompare('p-1')
    expect(isInCompare('p-1')).toBe(true)
  })

  it('toggleCompare removes when already present', () => {
    addToCompare('p-1')
    toggleCompare('p-1')
    expect(isInCompare('p-1')).toBe(false)
  })

  it('clearCompare removes all products', () => {
    addToCompare('p-1')
    addToCompare('p-2')
    addToCompare('p-3')
    clearCompare()
    expect(isInCompare('p-1')).toBe(false)
    expect(isInCompare('p-2')).toBe(false)
    expect(isInCompare('p-3')).toBe(false)
  })

  it('enforces maximum of 5 compare items', () => {
    addToCompare('p-1')
    addToCompare('p-2')
    addToCompare('p-3')
    addToCompare('p-4')
    addToCompare('p-5')
    addToCompare('p-6')

    expect(isInCompare('p-5')).toBe(true)
    expect(isInCompare('p-6')).toBe(false)
  })
})
