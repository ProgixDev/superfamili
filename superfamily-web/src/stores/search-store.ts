import { create } from 'zustand'

interface SearchFilters {
  query: string
  ville: string
  codePostal: string
  typeGarde: string[]
  langues: string[]
  disponibilite: string[]
  tarifMin: number | null
  tarifMax: number | null
  ageEnfantMin: number | null
  ageEnfantMax: number | null
  distance: number | null
  tri: 'pertinence' | 'tarif_asc' | 'tarif_desc' | 'distance' | 'note'
  page: number
  parPage: number
}

interface SearchState extends SearchFilters {
  setQuery: (query: string) => void
  setVille: (ville: string) => void
  setCodePostal: (codePostal: string) => void
  setTypeGarde: (typeGarde: string[]) => void
  setLangues: (langues: string[]) => void
  setDisponibilite: (disponibilite: string[]) => void
  setTarifMin: (tarifMin: number | null) => void
  setTarifMax: (tarifMax: number | null) => void
  setAgeEnfantMin: (ageEnfantMin: number | null) => void
  setAgeEnfantMax: (ageEnfantMax: number | null) => void
  setDistance: (distance: number | null) => void
  setTri: (tri: SearchFilters['tri']) => void
  setPage: (page: number) => void
  setParPage: (parPage: number) => void
  resetFilters: () => void
}

const initialFilters: SearchFilters = {
  query: '',
  ville: '',
  codePostal: '',
  typeGarde: [],
  langues: [],
  disponibilite: [],
  tarifMin: null,
  tarifMax: null,
  ageEnfantMin: null,
  ageEnfantMax: null,
  distance: null,
  tri: 'pertinence',
  page: 1,
  parPage: 20,
}

export const useSearchStore = create<SearchState>((set) => ({
  ...initialFilters,

  setQuery: (query) => set({ query, page: 1 }),
  setVille: (ville) => set({ ville, codePostal: '', page: 1 }),
  setCodePostal: (codePostal) => set({ codePostal, ville: '', page: 1 }),
  setTypeGarde: (typeGarde) => set({ typeGarde, page: 1 }),
  setLangues: (langues) => set({ langues, page: 1 }),
  setDisponibilite: (disponibilite) => set({ disponibilite, page: 1 }),
  setTarifMin: (tarifMin) => set({ tarifMin, page: 1 }),
  setTarifMax: (tarifMax) => set({ tarifMax, page: 1 }),
  setAgeEnfantMin: (ageEnfantMin) => set({ ageEnfantMin, page: 1 }),
  setAgeEnfantMax: (ageEnfantMax) => set({ ageEnfantMax, page: 1 }),
  setDistance: (distance) => set({ distance, page: 1 }),
  setTri: (tri) => set({ tri, page: 1 }),
  setPage: (page) => set({ page }),
  setParPage: (parPage) => set({ parPage, page: 1 }),

  resetFilters: () => set(initialFilters),
}))
