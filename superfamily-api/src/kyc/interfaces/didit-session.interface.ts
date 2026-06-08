/**
 * TypeScript mirrors of the Didit Sessions API v3 contracts.
 *
 * Source: https://docs.didit.me/sessions-api/create-session
 *
 * These are NOT class-validator DTOs — they're plain interfaces used for
 * typing the server-to-Didit HTTP calls. We don't need runtime validation
 * on Didit's response (we trust it after TLS), just types.
 */

/** Request body for `POST https://verification.didit.me/v3/session/`. */
export interface DiditCreateSessionRequest {
  /** Workflow UUID from the Didit Business Console. Required. */
  workflow_id: string;
  /**
   * Opaque per-user reference. Didit echoes this in every webhook event for
   * the session. We set it to `profiles.id` so the webhook handler can
   * correlate results back to a user.
   */
  vendor_data?: string;
  /**
   * URL Didit redirects the user to after verification. This is NOT the
   * webhook URL — webhooks are configured separately in the console.
   */
  callback?: string;
  /** Freeform metadata echoed in webhook payloads. Not shown to the user. */
  metadata?: Record<string, unknown>;
  /** ISO 639-1 language code. Optional; Didit auto-detects otherwise. */
  language?: string;
  contact_details?: {
    email?: string;
    send_notification_emails?: boolean;
    email_lang?: string;
    phone?: string;
  };
}

/** 201 Created response body from `POST .../v3/session/`. */
export interface DiditCreateSessionResponse {
  session_id: string;
  session_number: number;
  session_token: string;
  vendor_data: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  workflow_id: string;
  callback: string | null;
  /**
   * The Unilink the user opens to perform verification. Works on desktop
   * (redirect) and mobile (QR-scan handoff). Frontend should treat this
   * as opaque and open it in a new window / show as a QR.
   */
  url: string;
}
