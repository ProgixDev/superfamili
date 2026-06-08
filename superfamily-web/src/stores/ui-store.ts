import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  modalData: Record<string, unknown> | null
  isMobileMenuOpen: boolean

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (modalId: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  setMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  modalData: null,
  isMobileMenuOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openModal: (modalId, data) =>
    set({ activeModal: modalId, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
}))
