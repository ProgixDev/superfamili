import { createClient } from "@/lib/supabase/client"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

/**
 * Resolves the current Bearer token the same way `apiPost` / `apiGet`
 * do, but returns just the token string so we can set it on
 * `XMLHttpRequest` (which doesn't accept a `HeadersInit` object the way
 * `fetch` does).
 *
 * Kept separate from `client.ts`'s `getAuthHeaders` so each call site
 * can pick the shape it needs without duplicating Supabase refresh
 * logic. If auth drifts, fix it here AND in client.ts.
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    const expiresAt = session.expires_at ?? 0
    const now = Math.floor(Date.now() / 1000)
    if (expiresAt - now > 60) {
      return session.access_token
    }
    const {
      data: { session: refreshed },
    } = await supabase.auth.refreshSession()
    return refreshed?.access_token ?? null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export interface UploadProgress {
  /** Bytes sent so far. */
  loaded: number
  /** Total bytes the browser believes it will send. */
  total: number
  /** 0–100 integer, computed safely (returns 0 when total is unknown). */
  percent: number
}

export interface UploadOptions {
  /** Extra form fields to include alongside the file. */
  fields?: Record<string, string | undefined>
  /** Form field name the backend expects the file under. Default `file`. */
  fileFieldName?: string
  /** Progress callback fired during upload. */
  onProgress?: (progress: UploadProgress) => void
  /** Lets the caller cancel an in-flight upload. */
  signal?: AbortSignal
}

export interface UploadResult<T> {
  data: T
  status: number
}

/**
 * POSTs a `multipart/form-data` body to `${BASE_URL}${path}` with the
 * current user's Bearer token attached, reporting upload progress
 * through `options.onProgress`.
 *
 * Why XMLHttpRequest instead of `fetch`?
 *   Browsers don't expose upload progress via the `fetch` API yet
 *   (streams are read-only on the client side). XMLHttpRequest's
 *   `upload.onprogress` event is the only reliable way to drive a
 *   real-time progress bar.
 *
 * The response body is parsed as JSON; `{ success: false, error: {...} }`
 * envelopes from our `HttpExceptionFilter` are unwrapped into a thrown
 * `Error` with the server's message. Network failures throw a generic
 * "Erreur réseau" error.
 */
export async function apiUpload<T>(
  path: string,
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult<T>> {
  const token = await getAuthToken()

  const form = new FormData()
  form.append(options.fileFieldName ?? "file", file, file.name)
  for (const [key, value] of Object.entries(options.fields ?? {})) {
    if (value === undefined || value === null) continue
    form.append(key, value)
  }

  return new Promise<UploadResult<T>>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${BASE_URL}${path}`, true)

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    }
    // Do NOT set Content-Type — the browser sets it automatically to
    // `multipart/form-data; boundary=...`. Overriding it here breaks
    // the boundary and the backend fails to parse the body.

    // Progress events
    if (options.onProgress) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        const percent = event.lengthComputable
          ? Math.floor((event.loaded / event.total) * 100)
          : 0
        options.onProgress!({
          loaded: event.loaded,
          total: event.total,
          percent,
        })
      }
    }

    // Completion
    xhr.onload = () => {
      const status = xhr.status
      let body: any = null
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        // fall through — body stays null
      }

      if (status >= 200 && status < 300) {
        // Unwrap `{ success, data }` envelopes from TransformInterceptor.
        const payload =
          body && typeof body === "object" && "data" in body
            ? (body.data as T)
            : (body as T)
        resolve({ data: payload, status })
        return
      }

      const message =
        (body && typeof body === "object" && body.error?.message) ||
        (body && typeof body === "object" && body.message) ||
        `Erreur ${status}`
      reject(new Error(message))
    }

    xhr.onerror = () => reject(new Error("Erreur réseau lors du téléversement."))
    xhr.onabort = () => reject(new Error("Téléversement annulé."))

    // Cancellation via AbortSignal
    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort()
        return
      }
      options.signal.addEventListener("abort", () => xhr.abort(), {
        once: true,
      })
    }

    xhr.send(form)
  })
}
