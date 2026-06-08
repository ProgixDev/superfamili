import { createClient } from '@/lib/supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // getSession reads from local storage/cookies (fast, no network call)
  // but may return a stale/expired token
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    // Check if the token is about to expire (within 60 seconds)
    const expiresAt = session.expires_at ?? 0
    const now = Math.floor(Date.now() / 1000)

    if (expiresAt - now > 60) {
      // Token still fresh, use it directly
      headers['Authorization'] = `Bearer ${session.access_token}`
      return headers
    }

    // Token is expired or about to expire, force a refresh
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    if (refreshed?.access_token) {
      headers['Authorization'] = `Bearer ${refreshed.access_token}`
      return headers
    }
  }

  // No session at all -- try getUser which may trigger a refresh
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: refreshed } = await supabase.auth.getSession()
    if (refreshed.session?.access_token) {
      headers['Authorization'] = `Bearer ${refreshed.session.access_token}`
    }
  }

  return headers
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // The Nest API wraps errors as `{ success:false, error:{ code, message, details } }`
    // (see HttpExceptionFilter). Older callsites returned `{ message }` directly.
    // Try both shapes so we always surface a useful message instead of the
    // generic "Erreur 404".
    const body = await response.json().catch(() => null as any)
    const message =
      body?.error?.message ||
      body?.message ||
      `Erreur ${response.status}`
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const headers = await getAuthHeaders()
  const url = new URL(`${BASE_URL}${path}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  })

  return handleResponse<T>(response)
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  return handleResponse<T>(response)
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  return handleResponse<T>(response)
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  return handleResponse<T>(response)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  })

  return handleResponse<T>(response)
}
