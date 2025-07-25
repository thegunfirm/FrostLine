"use client"

import { useEffect, useRef, useCallback } from 'react'
import { trpc } from '@/trpc/client'
import { useCart, CartItem } from '@/hooks/use-cart'
import { isAuthenticated } from '@/hooks/use-cart'
import { debounce } from 'lodash'

export function CartSync() {
  const { items } = useCart()
  const syncMutation = trpc.cart.syncCart.useMutation()
  const lastSyncTime = useRef(0)
  const THROTTLE_MS = 2000 // Minimum time between syncs

  const syncCart = useCallback(
    debounce(async (currentItems: CartItem[]) => {
      const now = Date.now()
      if (now - lastSyncTime.current < THROTTLE_MS) return

      try {
        if (await isAuthenticated()) {
          lastSyncTime.current = now
          // Send items directly - the cart router will wrap them in 'item' objects
          await syncMutation.mutateAsync({
            items: currentItems
          })
        }
      } catch (error) {
        console.error('Error syncing cart:', error)
      }
    }, 1000),
    [syncMutation]
  )

  useEffect(() => {
    if (items.length > 0) {
      syncCart(items)
    }

    return () => {
      syncCart.cancel()
    }
  }, [items, syncCart])

  return null
}