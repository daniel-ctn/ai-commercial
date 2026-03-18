import { useSyncExternalStore } from 'react'

const MAX_ITEMS = 12
const STORAGE_KEY = 'ai-commercial:recently-viewed'

type Listener = () => void

interface RecentProduct {
  id: string
  name: string
  price: number
  image_url: string | null
  viewedAt: number
}

function isRecentProduct(value: unknown): value is RecentProduct {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    (typeof item.image_url === 'string' || item.image_url === null) &&
    typeof item.viewedAt === 'number'
  )
}

let recentProducts: RecentProduct[] = loadFromStorage()
const listeners = new Set<Listener>()

function loadFromStorage(): RecentProduct[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(isRecentProduct).slice(0, MAX_ITEMS)
    }
    return []
  } catch {
    return []
  }
}

function saveToStorage(items: RecentProduct[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // silently ignore
  }
}

function emitChange() {
  saveToStorage(recentProducts)
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return recentProducts
}

export function trackProductView(product: { id: string; name: string; price: number; image_url: string | null }) {
  const filtered = recentProducts.filter((p) => p.id !== product.id)
  recentProducts = [
    { ...product, viewedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_ITEMS)
  emitChange()
}

export function clearRecentlyViewed() {
  recentProducts = []
  emitChange()
}

export function useRecentlyViewed() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
