import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'

// IMPORTANT: role values are stored and returned by the API in English
// ('parent' | 'educator' | 'admin'). Only the URL paths are French
// (/educateur/...). Don't conflate the two.
export type UserRole = 'parent' | 'educator' | 'admin'

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole | null
  profileId: string | null
  isLoading: boolean

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setRole: (role: UserRole | null) => void
  setProfileId: (profileId: string | null) => void
  setIsLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState = {
  user: null,
  session: null,
  role: null,
  profileId: null,
  isLoading: true,
}

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setRole: (role) => set({ role }),
  setProfileId: (profileId) => set({ profileId }),
  setIsLoading: (isLoading) => set({ isLoading }),

  reset: () => set(initialState),
}))
