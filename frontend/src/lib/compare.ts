import { useCallback, useSyncExternalStore } from 'react'

const MAX_COMPARE_ITEMS = 5

type Listener = () => void

let compareIds: string[] = []
const listeners = new Set<Listener>()

function emitChange() {
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return compareIds
}

export function addToCompare(id: string) {
  if (compareIds.includes(id) || compareIds.length >= MAX_COMPARE_ITEMS) return
  compareIds = [...compareIds, id]
  emitChange()
}

export function removeFromCompare(id: string) {
  if (!compareIds.includes(id)) return
  compareIds = compareIds.filter((i) => i !== id)
  emitChange()
}

export function toggleCompare(id: string) {
  if (compareIds.includes(id)) {
    removeFromCompare(id)
  } else {
    addToCompare(id)
  }
}

export function clearCompare() {
  compareIds = []
  emitChange()
}

export function isInCompare(id: string): boolean {
  return compareIds.includes(id)
}

/**
 * Hook to subscribe to the compare list reactively.
 * Uses useSyncExternalStore for tear-free reads of the module-level store.
 */
export function useCompareList() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ids,
    count: ids.length,
    isFull: ids.length >= MAX_COMPARE_ITEMS,
    isInCompare: useCallback((id: string) => ids.includes(id), [ids]),
    add: addToCompare,
    remove: removeFromCompare,
    toggle: toggleCompare,
    clear: clearCompare,
  }
}
