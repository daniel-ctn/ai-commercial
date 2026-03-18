import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '#/lib/api'
import { useAuth } from '#/lib/auth'
import { toast } from 'sonner'

interface FavoriteProduct {
  id: string
  name: string
  price: number
  original_price: number | null
  image_url: string | null
  shop_id: string
  shop_name: string | null
  category_id: string
  category_name: string | null
  favorited_at: string
}

export function useFavoriteIds() {
  const { user } = useAuth()
  const [ids, setIds] = useState<string[]>([])

  const refresh = useCallback(async () => {
    if (!user) {
      setIds([])
      return
    }
    try {
      const result = await api.get<string[]>('/favorites/ids')
      setIds(result)
    } catch {
      // silently ignore
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(
    async (productId: string) => {
      if (!user) {
        toast.error('Sign in to save favorites')
        return
      }

      setIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]))
      try {
        await api.post(`/favorites/${productId}`)
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          return
        }
        setIds((prev) => prev.filter((id) => id !== productId))
      }
    },
    [user],
  )

  const remove = useCallback(
    async (productId: string) => {
      if (!user) {
        toast.error('Sign in to manage favorites')
        return
      }

      setIds((prev) => prev.filter((id) => id !== productId))
      try {
        await api.delete(`/favorites/${productId}`)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return
        }
        setIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]))
      }
    },
    [user],
  )

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) {
        toast.error('Sign in to save favorites')
        return
      }
      if (ids.includes(productId)) {
        await remove(productId)
      } else {
        await add(productId)
      }
    },
    [user, ids, add, remove],
  )

  return {
    ids,
    isFavorite: useCallback((id: string) => ids.includes(id), [ids]),
    add,
    remove,
    toggle,
    refresh,
  }
}

export function useFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([])
      return
    }
    setLoading(true)
    try {
      const result = await api.get<FavoriteProduct[]>('/favorites')
      setFavorites(result)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { favorites, loading, refresh }
}
