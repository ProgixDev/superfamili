"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/lib/api/client"

/**
 * TypeScript mirrors of the backend consent contracts. Kept in sync with
 * `superfamily-api/src/consents/consents.service.ts` manually.
 */

export type ConsentType =
  | "terms_of_use"
  | "privacy_policy"
  | "kyc_verification"
  | "reference_contact"
  | "background_check_storage"
  | "marketing_emails"

export interface RequiredConsent {
  consent_type: ConsentType
  version: string
  required: boolean
  already_accepted: boolean
}

export interface ConsentHistoryRow {
  id: string
  consent_type: ConsentType
  version: string
  accepted: boolean
  accepted_at: string
  revoked_at: string | null
  ip_address: string | null
  user_agent: string | null
}

export interface PolicyVersion {
  id: string
  consent_type: ConsentType
  version: string
  effective_date: string
  content_md: string
}

/** Response envelope used consistently by the backend's TransformInterceptor. */
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

// ─── GET /consents/required ──────────────────────────────────────────

/**
 * Returns the list of consents that apply to the authenticated user
 * (with role-based filtering done server-side) plus whether each one is
 * already accepted for the current version.
 *
 * Enabled-gated so the signup consent modal can reuse this hook BEFORE
 * the user has a profile (the hook returns nothing in that case).
 */
export function useRequiredConsents(enabled = true) {
  return useQuery<RequiredConsent[]>({
    queryKey: ["consents", "required"],
    queryFn: async () => {
      const raw = await apiGet<ApiEnvelope<RequiredConsent[]>>(
        "/consents/required",
      )
      return unwrap(raw)
    },
    enabled,
    staleTime: 30 * 1000, // re-fetch on focus, but not on every remount
  })
}

// ─── POST /consents/accept ───────────────────────────────────────────

export interface AcceptConsentPayload {
  consent_type: ConsentType
  version: string
  accepted: boolean
}

export function useAcceptConsent() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, AcceptConsentPayload>({
    mutationFn: (payload) => apiPost("/consents/accept", payload),
    onSuccess: () => {
      // Invalidate BOTH the "required" list and the history so any
      // visible consent UI re-reads. The required-list query is what
      // the signup/KYC/etc. modals read.
      queryClient.invalidateQueries({ queryKey: ["consents", "required"] })
      queryClient.invalidateQueries({ queryKey: ["consents", "history"] })
    },
  })
}

// ─── GET /consents/history ───────────────────────────────────────────

export function useConsentHistory() {
  return useQuery<ConsentHistoryRow[]>({
    queryKey: ["consents", "history"],
    queryFn: async () => {
      const raw = await apiGet<ApiEnvelope<ConsentHistoryRow[]>>(
        "/consents/history",
      )
      return unwrap(raw)
    },
  })
}

// ─── DELETE /consents/:type ─────────────────────────────────────────

export function useRevokeConsent() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, ConsentType>({
    mutationFn: (type) => apiDelete(`/consents/${type}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consents", "required"] })
      queryClient.invalidateQueries({ queryKey: ["consents", "history"] })
    },
  })
}

// ─── GET /consents/policy ───────────────────────────────────────────

/**
 * Fetches the Markdown content of a specific policy version. The
 * endpoint is `@Public()` on the backend so we can call it even
 * pre-signup (for the inline "read terms" button in the signup modal).
 *
 * Results are cached aggressively — policy content changes only via
 * a new migration + version bump, so stale data is fine for hours.
 */
export function usePolicyContent(
  consentType: ConsentType | null,
  version?: string,
) {
  return useQuery<PolicyVersion>({
    queryKey: ["consents", "policy", consentType, version ?? "current"],
    queryFn: async () => {
      const raw = await apiGet<ApiEnvelope<PolicyVersion>>(
        "/consents/policy",
        {
          type: consentType!,
          ...(version ? { version } : {}),
        },
      )
      return unwrap(raw)
    },
    enabled: !!consentType,
    staleTime: 60 * 60 * 1000, // 1h
  })
}
