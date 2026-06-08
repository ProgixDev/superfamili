/**
 * Didit webhook payload shapes.
 *
 * Source: https://docs.didit.me/integration/webhooks
 *
 * We handle two event types fully (`status.updated` and `data.updated`) and
 * log-and-ignore the others. The payloads are loosely typed on purpose —
 * Didit adds fields over time, and we store the raw payload in
 * `kyc_verifications.raw_webhook_payload` anyway.
 */

/**
 * Every Didit session status. Matches the `status` field in the webhook
 * payload verbatim — including the spaces in "In Review" / "In Progress" /
 * "Not Started".
 */
export type DiditSessionStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Approved'
  | 'Declined'
  | 'In Review'
  | 'Abandoned';

/** Top-level Didit webhook event types. We only act on the first two. */
export type DiditWebhookType =
  | 'status.updated'
  | 'data.updated'
  | 'user.status.updated'
  | 'user.data.updated'
  | 'business.status.updated'
  | 'business.data.updated'
  | 'activity.created'
  | 'transaction.created'
  | 'transaction.status.updated';

/**
 * Minimum envelope common to every webhook event. Individual event types
 * add more fields but always include these.
 */
export interface DiditWebhookEnvelope {
  webhook_type: DiditWebhookType;
  /** Unix seconds. Used for signature freshness check. */
  timestamp: number;
  created_at: number;
  vendor_data?: string;
  /** Present on session events. Absent on user/business/transaction events. */
  session_id?: string;
  status?: DiditSessionStatus;
  workflow_id?: string;
  metadata?: Record<string, unknown>;
  decision?: DiditDecision;
  [key: string]: unknown;
}

/**
 * The `decision` sub-object, populated only when the session reaches a
 * terminal state (Approved / Declined / In Review). We extract a handful of
 * fields into typed columns; everything else lives in raw_webhook_payload.
 */
export interface DiditDecision {
  session_id?: string;
  session_number?: number;
  session_url?: string;
  status?: DiditSessionStatus;
  workflow_id?: string;
  features?: string[];
  vendor_data?: string;
  metadata?: Record<string, unknown>;

  /** V3 plural arrays — we only read the first element for our extraction. */
  id_verifications?: Array<{
    node_id?: string;
    status?: DiditSessionStatus;
    document_type?: string;
    document_number?: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    expiration_date?: string;
    issuing_state?: string;
    address?: string;
    front_image?: string;
    back_image?: string;
    front_image_quality_score?: { overall_score?: number };
    back_image_quality_score?: { overall_score?: number };
    warnings?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  }>;

  liveness_checks?: Array<{
    node_id?: string;
    status?: DiditSessionStatus;
    method?: string;
    score?: number;
    [key: string]: unknown;
  }>;

  face_matches?: Array<{
    node_id?: string;
    status?: DiditSessionStatus;
    score?: number;
    [key: string]: unknown;
  }>;

  ip_analyses?: Array<{
    node_id?: string;
    status?: DiditSessionStatus;
    ip_address?: string;
    ip_country_code?: string;
    is_vpn_or_tor?: boolean;
    [key: string]: unknown;
  }>;

  created_at?: string;
  [key: string]: unknown;
}
