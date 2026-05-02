import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,
      isModalOpen: false,

      setModalOpen: (open) => set({ isModalOpen: open }),

      syncUser: (currentId) => {
        const storedId = get().userId
        if (storedId !== currentId) {
          console.log(`[Cart] Identity change detected (${storedId} -> ${currentId}). Isolating data.`)
          set({ items: [], userId: currentId })
        }
      },

      addItem: (product) => {
        const items = get().items
        const existingItem = items.find((item) => item.id === product.id)

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          })
        } else {
          set({ items: [...items, { ...product, quantity: 1 }] })
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.id !== productId),
        })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((item) =>
            item.id === productId ? { ...item, quantity } : item
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + Number(item.final_price || item.price) * item.quantity,
          0
        )
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'pawhub-cart-storage',
    }
  )
)

export default useCartStore
