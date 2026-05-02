import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getProfile } from '../api/authApi'
import useCartStore from './cartStore'
import useWishlistStore from './wishlistStore'
import useNotificationStore from './notificationStore'
import useChatStore from './chatStore'
import useStatusStore from './statusStore'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setTokens: (access, refresh) => {
        sessionStorage.setItem('access_token', access)
        sessionStorage.setItem('refresh_token', refresh)
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      fetchProfile: async () => {
        try {
          const { data } = await getProfile()
          set({ user: data })
        } catch {
          get().logout()
        }
      },

      logout: () => {
        // Clear all user-specific stores
        useCartStore.getState().clearCart()
        useWishlistStore.getState().clearWishlist()
        useNotificationStore.getState().clearNotifications()
        useNotificationStore.getState().closeWebSocket()
        useChatStore.getState().clearChat()
        useStatusStore.getState().clearStatus()
        useStatusStore.getState().closeStatusWS()

        sessionStorage.removeItem('dr_emergency_intent')
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated }),
    }
  )
)

export default useAuthStore
