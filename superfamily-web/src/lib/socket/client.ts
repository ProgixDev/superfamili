import { io, type Socket } from "socket.io-client"

/**
 * Browser-side Socket.IO client for SuperFamily realtime namespaces.
 *
 * The backend exposes multiple namespaces — currently `/kyc` (license +
 * KYC status updates) and `/messaging` (chat). Each namespace gets its
 * own singleton connection, keyed by namespace, so components can share
 * a single socket without reconnecting on every mount.
 *
 * Usage:
 *
 *   const socket = getSocket("/kyc", { profileId })
 *   socket.on("kyc:status-updated", handler)
 *   // …later
 *   socket.off("kyc:status-updated", handler)
 *
 * The `disconnectSocket` helper is exposed mostly for tests and for
 * full logout flows — day-to-day component usage should just `.off`
 * their listeners and leave the connection alive.
 */

const sockets = new Map<string, Socket>()

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3001"
  // Strip any trailing slash so the namespace path joins cleanly.
  return url.replace(/\/+$/, "")
}

export interface SocketHandshake {
  /**
   * Educator or parent profile id (profiles.id in the DB). Included in
   * the handshake query so the backend can join the socket to the
   * `user:${profileId}` room on connect. If omitted, the socket
   * connects but receives no user-scoped events.
   */
  profileId?: string
}

/**
 * Returns (lazily creating) the singleton Socket for `namespace`. Safe
 * to call repeatedly from multiple components — the connection is
 * shared.
 *
 * The singleton is keyed by `namespace` only. If `profileId` changes
 * (user switched accounts), call `disconnectSocket(namespace)` first
 * to force a reconnect with the new handshake.
 */
export function getSocket(
  namespace: string,
  handshake: SocketHandshake = {},
): Socket {
  const existing = sockets.get(namespace)
  if (existing) return existing

  const socket = io(`${getBaseUrl()}${namespace}`, {
    query: handshake.profileId ? { profileId: handshake.profileId } : undefined,
    // Allow polling fallback for flaky networks. WebSocket is still
    // preferred and will upgrade automatically.
    transports: ["websocket", "polling"],
    // Auto-reconnect with exponential backoff. This lets the UI keep
    // working during brief network blips without any code changes.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    // We don't want the connection to live forever silently if the
    // user closes the tab — Socket.IO handles that on its own, but
    // setting a sane timeout prevents phantom connections on slow
    // networks from holding the page back during initial paint.
    timeout: 10000,
  })

  sockets.set(namespace, socket)
  return socket
}

/**
 * Disconnects and removes the singleton for a namespace. Use on full
 * logout, or when the handshake (profileId) needs to change.
 */
export function disconnectSocket(namespace: string): void {
  const socket = sockets.get(namespace)
  if (!socket) return
  socket.removeAllListeners()
  socket.disconnect()
  sockets.delete(namespace)
}

/** Full teardown — used during logout. */
export function disconnectAllSockets(): void {
  for (const ns of Array.from(sockets.keys())) {
    disconnectSocket(ns)
  }
}
