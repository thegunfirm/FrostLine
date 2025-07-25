import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

export interface CartItem {
  id: string;
  productId: number;
  productSku: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  requiresFFL: boolean;
  selectedFFL?: string;
  manufacturer: string;
  addedAt: string;
}

interface AddToCartParams {
  productId: number;
  productSku: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  requiresFFL: boolean;
  selectedFFL?: string;
  manufacturer: string;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  isCartOpen: boolean;
  
  // Actions
  addItem: (params: AddToCartParams) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  setCartOpen: (isOpen: boolean) => void;
  
  // Computed properties
  getTotalPrice: () => number;
  getItemCount: () => number;
  hasFirearms: () => boolean;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      isCartOpen: false,

      addItem: async (params: AddToCartParams) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(item => 
          item.productId === params.productId && 
          item.productSku === params.productSku &&
          Math.abs(item.price - params.price) < 0.01 // Same price tier
        );

        if (existingItem) {
          // Update quantity
          await get().updateQuantity(existingItem.id, existingItem.quantity + params.quantity);
        } else {
          // Add new item
          const newItem: CartItem = {
            id: `${params.productId}_${params.productSku}_${Date.now()}`,
            productId: params.productId,
            productSku: params.productSku,
            productName: params.productName,
            productImage: params.productImage,
            quantity: params.quantity,
            price: params.price,
            requiresFFL: params.requiresFFL,
            selectedFFL: params.selectedFFL,
            manufacturer: params.manufacturer,
            addedAt: new Date().toISOString(),
          };

          set(state => ({
            items: [...state.items, newItem],
            isCartOpen: true, // Auto-open cart when item added
          }));

          // Sync with server
          await get().syncWithServer();
        }
      },

      removeItem: async (itemId: string) => {
        set(state => ({
          items: state.items.filter(item => item.id !== itemId)
        }));
        
        await get().syncWithServer();
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          await get().removeItem(itemId);
          return;
        }

        set(state => ({
          items: state.items.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          )
        }));

        await get().syncWithServer();
      },

      clearCart: async () => {
        set({ items: [] });
        await get().syncWithServer();
      },

      syncWithServer: async () => {
        try {
          set({ isLoading: true });
          
          const { items } = get();
          await apiRequest('POST', '/api/cart/sync', { items });
          
        } catch (error) {
          console.error('Failed to sync cart with server:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      setCartOpen: (isOpen: boolean) => {
        set({ isCartOpen: isOpen });
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      hasFirearms: () => {
        const { items } = get();
        return items.some(item => item.requiresFFL);
      }
    }),
    {
      name: 'gun-firm-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        // Don't persist loading states or cart open state
      }),
    }
  )
);