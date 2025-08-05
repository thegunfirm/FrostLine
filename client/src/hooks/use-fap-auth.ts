import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiRequest } from '@/lib/queryClient';

interface FapUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  membershipPaid: boolean;
  role: string;
}

interface FapAuthState {
  user: FapUser | null;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    subscriptionTier: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateSubscriptionTier: (tier: string, paid: boolean) => Promise<void>;
  validateSession: () => Promise<void>;
  checkEnforcementSettings: () => Promise<{
    subscriptionEnforced: boolean;
    fflSources: { useAtf: boolean; useRsr: boolean };
  }>;
}

export const useFapAuth = create<FapAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiRequest('POST', '/api/fap/auth/login', {
            email,
            password,
          });
          
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Login failed');
          }
          
          set({ user: data.user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await apiRequest('POST', '/api/fap/auth/register', userData);
          
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
          }
          
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiRequest('POST', '/api/fap/auth/logout', {});
          set({ user: null });
          
          // Clear cart on logout as per requirements
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cart-storage');
          }
        } catch (error) {
          console.error('Logout error:', error);
          // Clear local state even if API call fails
          set({ user: null });
        }
      },

      updateSubscriptionTier: async (tier: string, paid: boolean) => {
        const { user } = get();
        if (!user) throw new Error('No user logged in');
        
        set({ isLoading: true });
        try {
          const response = await apiRequest('PUT', `/api/fap/users/${user.id}/subscription`, {
            subscriptionTier: tier,
            membershipPaid: paid,
          });
          
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Tier update failed');
          }
          
          set({ 
            user: { ...user, ...data.user },
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      validateSession: async () => {
        try {
          const response = await apiRequest('GET', '/api/fap/validate-session');
          
          if (response.ok) {
            const data = await response.json();
            set({ user: data.user });
          } else {
            set({ user: null });
          }
        } catch (error) {
          console.error('Session validation error:', error);
          set({ user: null });
        }
      },

      checkEnforcementSettings: async () => {
        const response = await apiRequest('GET', '/api/fap/enforcement-settings');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to check enforcement settings');
        }
        
        return data;
      },
    }),
    {
      name: 'fap-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);