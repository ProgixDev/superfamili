"use client"

import * as React from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiGet, apiPost } from "@/lib/api/client"
import { getSocket } from "@/lib/socket/client"

/**
 * Backend contracts — mirror the shapes returned by the NestJS KYC
 * service (src/kyc/kyc.service.ts).
 */

export type KycStatus =
  | "not_started"
  | "in_progress"
  | "approved"
  | "declined"
  | "expired"
  | "review_required"

export interface KycSession {
  session_id: string
  verification_url: string
  expires_at: string | null
}

export interface KycStatusResponse {
  status: KycStatus
  confidence_score: number | null
  decision: string | null
  completed_at: string | null
  didit_session_url: string | null
}

/**
 * Raw wire shapes: the backend wraps responses in `{ success, data }`
 * via TransformInterceptor. Our `apiPost` / `apiGet` helpers don't
 * unwrap, so we do it here for the KYC-specific types.
 */
interface ApiEnvelope<T> {
  success?: boolean
  data?: T
}

function unwrap<T>(raw: ApiEnvelope<T> | T): T {
  if (raw && typeof raw === "object" && "data" in raw && (raw as any).data !== undefined) {
    return (raw as ApiEnvelope<T>).data as T
  }
  return raw as T
}

// ─── POST /kyc/session ────────────────────────────────────────────────

/**
 * Starts a new Didit verification session on the backend. Returns the
 * Didit Unilink URL (`verification_url`) which the caller either opens
 * directly (mobile) or renders as a QR code (desktop handoff).
 *
 * Each call creates a fresh session — safe to retry on failure without
 * orphaning anything on the backend.
 */
export function useCreateKycSession() {
  return useMutation<KycSession, Error, void>({
    mutationFn: async () => {
      const raw = await apiPost<ApiEnvelope<KycSession>>("/kyc/session", {})
      return unwrap(raw)
    },
  })
}

// ─── GET /kyc/status (polling fallback) ──────────────────────────────

/**
 * Polls the backend for the current KYC status of the authenticated
 * educator. Used as a fallback path when the WebSocket can't reach
 * the user (flaky network, WAF interference, etc.).
 *
 * Poll cadence: every 3s while `in_progress`, paused once a terminal
 * state is reached. This matches the spec.
 */
export function useKycStatus(enabled = true) {
  return useQuery<KycStatusResponse>({
    queryKey: ["kyc", "status"],
    queryFn: async () => {
      const raw = await apiGet<ApiEnvelope<KycStatusResponse>>("/kyc/status")
      return unwrap(raw)
    },
    enabled,
    // Poll every 3s while the session is in progress, otherwise stop.
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "in_progress") return 3000
      return false
    },
    // Don't refetch on every window focus — the WebSocket handles that.
    refetchOnWindowFocus: false,
  })
}

// ─── WebSocket listener ──────────────────────────────────────────────

export interface KycStatusChangedPayload {
  status: KycStatus
  confidence_score: number | null
}

/**
 * Subscribes to `kyc:status-updated` on the `/kyc` Socket.IO namespace
 * and invokes `onStatusChange` whenever the backend fires an event for
 * the current user. Automatically cleans up the listener on unmount
 * (but leaves the shared socket connection open for other tabs/views).
 *
 * The caller must pass the educator's `profileId` — we need it for the
 * handshake query so the backend knows which `user:${id}` room to join
 * the socket to. If `profileId` is undefined (e.g., profile still
 * loading), the hook is inert — it won't try to connect with a bogus
 * handshake, and it will activate once the id is available.
 */
export function useKycWebSocket(
  profileId: string | undefined,
  onStatusChange: (payload: KycStatusChangedPayload) => void,
): void {
  // Stash the callback in a ref so listener identity is stable across
  // renders — otherwise every parent re-render would tear down and
  // re-add the listener, risking missed events during the gap.
  const handlerRef = React.useRef(onStatusChange)
  React.useEffect(() => {
    handlerRef.current = onStatusChange
  }, [onStatusChange])

  React.useEffect(() => {
    if (!profileId) return

    const socket = getSocket("/kyc", { profileId })

    const listener = (payload: KycStatusChangedPayload) => {
      handlerRef.current(payload)
    }

    socket.on("kyc:status-updated", listener)

    return () => {
      socket.off("kyc:status-updated", listener)
    }
  }, [profileId])
}
