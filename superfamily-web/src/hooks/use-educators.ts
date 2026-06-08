'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api/client'
import { useSearchStore } from '@/stores/search-store'
import type { Educator, PaginatedResponse } from '@/types/api'

export function useEducatorSearch() {
  const store = useSearchStore()

  const params: Record<string, string> = {}

  // City-based search (primary)
  if (store.ville) {
    params.city = store.ville
  }
  // Fallback to postal code if set directly
  if (store.codePostal) {
    params.postal_code = store.codePostal.trim().toUpperCase()
  }

  if (store.typeGarde.length > 0) params.service_category = store.typeGarde[0]
  if (store.tarifMax !== null) params.max_hourly_rate = String(store.tarifMax * 100)
  if (store.distance !== null) params.max_distance_km = String(store.distance)

  const sortMap: Record<string, string> = {
    pertinence: 'relevance',
    distance: 'distance',
    tarif_asc: 'price',
    note: 'rating',
  }
  if (store.tri && sortMap[store.tri]) params.sort_by = sortMap[store.tri]

  params.page = String(store.page)
  params.limit = String(store.parPage)

  const hasLocation = !!store.ville || !!store.codePostal

  return useQuery<PaginatedResponse<Educator>>({
    queryKey: ['educators', 'search', params],
    queryFn: () => apiGet<PaginatedResponse<Educator>>('/educators/search', params),
    enabled: hasLocation,
  })
}

export function useCityAutocomplete(query: string) {
  return useQuery<{ city: string; province: string }[]>({
    queryKey: ['cities', 'autocomplete', query],
    queryFn: () =>
      apiGet<{ city: string; province: string }[]>('/educators/cities/autocomplete', {
        q: query,
        limit: '8',
      }),
    enabled: query.length >= 2,
    staleTime: 60_000,
  })
}

export function useEducatorProfile(id: string) {
  return useQuery<Educator>({
    queryKey: ['educators', id],
    queryFn: () => apiGet<Educator>(`/educators/${id}`),
    enabled: !!id,
  })
}
