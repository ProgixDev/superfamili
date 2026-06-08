"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPatch } from "@/lib/api/client"

/** Row shape returned by GET /onboarding/me. */
export interface OnboardingRow {
  user_id: string
  completed_steps: string[]
  tutorial_skipped: boolean
  tutorial_completed_at: string | null
  updated_at: string
}

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
}

function unwrap<T>(raw: ApiEnvelope<T> | T): T {
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    (raw as ApiEnvelope<T>).data !== undefined
  ) {
    return (raw as ApiEnvelope<T>).data as T
  }
  return raw as T
}

/**
 * Reads the onboarding state for the authenticated user. The backend
 * lazily creates a row on first access so this is always safe to call.
 */
export function useOnboarding(enabled = true) {
  return useQuery<OnboardingRow>({
    queryKey: ["onboarding", "me"],
    queryFn: async () => {
      const raw = await apiGet<ApiEnvelope<OnboardingRow>>("/onboarding/me")
      return unwrap(raw)
    },
    enabled,
    // Don't re-fetch on focus — the tour state isn't volatile. This
    // avoids the tour restarting every time the user Alt-Tabs back in.
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  })
}

export interface UpdateOnboardingPayload {
  completed_steps?: string[]
  skipped?: boolean
  completed?: boolean
}

export function useUpdateOnboarding() {
  const queryClient = useQueryClient()
  return useMutation<OnboardingRow, Error, UpdateOnboardingPayload>({
    mutationFn: async (payload) => {
      const raw = await apiPatch<ApiEnvelope<OnboardingRow>>(
        "/onboarding/me",
        payload,
      )
      return unwrap(raw)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["onboarding", "me"], data)
    },
  })
}
