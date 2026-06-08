"use client"

import * as React from "react"
import { useKycWebSocket, type KycStatusChangedPayload } from "@/hooks/use-kyc"

export interface KycStatusListenerProps {
  /**
   * Educator profile id (profiles.id). Required for the Socket.IO
   * handshake — the backend uses it to join the socket to the
   * `user:${profileId}` room. If not yet available (profile still
   * loading), pass `undefined` and the listener stays inert.
   */
  profileId: string | undefined
  /**
   * Callback fired on every `kyc:status-updated` event addressed to
   * this user. The caller typically uses this to drive the on-screen
   * state machine (e.g., show the success/failure screen).
   */
  onStatusChange: (payload: KycStatusChangedPayload) => void
}

/**
 * Declarative wrapper around `useKycWebSocket`. Renders nothing; its
 * only purpose is to open/close the WebSocket listener as a child of
 * the handoff UI so consumers can drop it into JSX without managing
 * the effect lifecycle themselves.
 *
 * Both this component and `useKycWebSocket` are provided because the
 * spec explicitly called for a component and a hook. In practice the
 * hook alone is sufficient — this is just the more React-idiomatic
 * form for callers who prefer declarative composition.
 */
export function KycStatusListener({
  profileId,
  onStatusChange,
}: KycStatusListenerProps): null {
  useKycWebSocket(profileId, onStatusChange)
  return null
}
