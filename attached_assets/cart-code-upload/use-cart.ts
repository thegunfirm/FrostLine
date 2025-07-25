// @ts-nocheck
import type { Product } from "@/payload-types"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { trpc } from "@/trpc/client"
import useUser from "./use-User"

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`,
            {
                credentials: 'include',
            }
        )
        const data = await res.json()
        return !!data?.user
    } catch (error) {
        console.error('Error checking auth state:', error)
        return false
    }
}

// Helper function to sync cart with server
export const syncCartIfAuthenticated = async () => {
    try {
        if (await isAuthenticated()) {
            // Call syncWithServer through the store to maintain context
            await useCart.getState().syncWithServer()
        }
    } catch (error) {
        console.error('Error syncing cart:', error)
    }
}

export type CartItem = {
    product: Product
    quantity: number
    upgradeablePrices: {
        price: number
        availableByTier: {
            tierLevel: number
            title: string
        }
    }[]
    currentTierLevel: number
    isShowcase: boolean
}

type CartState = {
    items: CartItem[]
    isCartOpen: boolean
    addItem: (item: Omit<CartItem, "quantity">) => void
    removeItem: (productId: string) => void
    clearCart: () => void
    setIsCartOpen: (isOpen: boolean) => void
    syncWithServer: () => void
    setServerCart: (serverItems: CartItem[]) => void
    setItems: (items: CartItem[]) => void
}

export const useCart = create<CartState>()(
    persist(
        (set) => ({
            items: [],
            isCartOpen: false,
            addItem: (item) => {
                set((state) => {
                    const existingItem = state.items.find((i) => i.product.id === item.product.id)

                    // Simply increment quantity if the item exists
                    if (existingItem) {
                        const newState = {
                            items: state.items.map((cartItem) =>
                                cartItem.product.id === item.product.id
                                    ? { ...item, quantity: (cartItem.quantity || 1) + 1 }
                                    // ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 }
                                    : item
                            ),
                            // Open the cart when item is added.
                            isCartOpen: true,
                            // Don't automatically open the cart when adding items
                            //isCartOpen: state.isCartOpen,
                        }
                        // Sync with server after state update
                        Promise.resolve().then(() => syncCartIfAuthenticated())
                        return newState
                    }

                    // Add new item with quantity 1
                    const newItem = {
                        ...item,
                        quantity: 1
                    }

                    const newState = {
                        items: [...state.items, newItem],
                        // Open the cart when item is added
                        isCartOpen: true,
                        // Don't automatically open the cart when adding items
                        //isCartOpen: state.isCartOpen,
                    }
                    // Sync with server after state update
                    Promise.resolve().then(() => syncCartIfAuthenticated())
                    return newState
                })
            },
            // Remove direct trpc usage from store
            syncWithServer: async () => {
                // This will be handled by a React component
                return
            },
            setServerCart: (serverItems) => set({ items: serverItems }),
            removeItem: (id) =>
                set((state) => {
                    const newState = {
                        items: state.items.filter((item) => item.product.id !== id),
                    }
                    // Sync with server after state update if authenticated
                    Promise.resolve().then(() => syncCartIfAuthenticated())
                    return newState
                }),
            // removeItem: (id) =>
            //     set((state) => ({
            //         items: state.items.filter((item) => item.product.id !== id),
            //     })),
            clearCart: () => set({ items: [] }),
            setItems: (items) => set({ items }),
            setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
        }),
        {
            name: "cart-storage",
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
