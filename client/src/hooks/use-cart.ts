import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

export interface CartItem {
  id: string;
  productId: number;
  product: Product;
  quantity: number;
  tierPriceUsed: 'Bronze' | 'Gold' | 'Platinum';
  priceSnapshot: number;
  addedAt: string;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  isCartOpen: boolean;
  
  // Actions
  addItem: (product: Product, tier: 'Bronze' | 'Gold' | 'Platinum') => Promise<void>;
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

      addItem: async (product: Product, tier: 'Bronze' | 'Gold' | 'Platinum') => {
        const currentItems = get().items;
        const existingItem = currentItems.find(item => 
          item.productId === product.id && item.tierPriceUsed === tier
        );
        
        let priceSnapshot: number;
        switch (tier) {
          case 'Bronze':
            priceSnapshot = parseFloat(product.priceBronze || '0');
            break;
          case 'Gold':
            priceSnapshot = parseFloat(product.priceGold || '0');
            break;
          case 'Platinum':
            priceSnapshot = parseFloat(product.pricePlatinum || '0');
            break;
          default:
            priceSnapshot = parseFloat(product.priceBronze || '0');
        }

        if (existingItem) {
          // Update quantity
          await get().updateQuantity(existingItem.id, existingItem.quantity + 1);
        } else {
          // Add new item
          const newItem: CartItem = {
            id: `${product.id}_${tier}_${Date.now()}`,
            productId: product.id,
            product,
            quantity: 1,
            tierPriceUsed: tier,
            priceSnapshot,
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
        return items.reduce((total, item) => total + (item.priceSnapshot * item.quantity), 0);
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      hasFirearms: () => {
        const { items } = get();
        return items.some(item => item.product.requiresFFL);
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