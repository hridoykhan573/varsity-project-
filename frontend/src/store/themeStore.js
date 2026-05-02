import { create } from 'zustand'

const useThemeStore = create((set) => ({
  isLightMode: true,
  toggleTheme: () => {},
  setTheme: () => {}
}))

export default useThemeStore
