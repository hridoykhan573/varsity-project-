import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useWishlistStore = create()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,
      isModalOpen: false,

      setModalOpen: (open) => set({ isModalOpen: open }),
      
      syncUser: (currentId) => {
        const storedId = get().userId
        if (storedId !== currentId) {
          console.log(`[Wishlist] Identity change detected (${storedId} -> ${currentId}). Isolating data.`)
          set({ items: [], userId: currentId })
        }
      },

      toggleWishlist: (product) => {
        const items = get().items
        const exists = items.find(item => item.id === product.id)
        
        if (exists) {
          set({ items: items.filter(item => item.id !== product.id) })
        } else {
          set({ items: [...items, product] })
        }
      },
      
      isInWishlist: (productId) => {
        return get().items.some(item => item.id === productId)
      },
      
      clearWishlist: () => set({ items: [] }),
      
      getTotalItems: () => get().items.length,
    }),
    {
      name: 'pawhub-wishlist-storage',
    }
  )
)

export default useWishlistStore
