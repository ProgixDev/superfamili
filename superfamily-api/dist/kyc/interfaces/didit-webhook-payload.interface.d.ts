export type DiditSessionStatus = 'Not Started' | 'In Progress' | 'Approved' | 'Declined' | 'In Review' | 'Abandoned';
export type DiditWebhookType = 'status.updated' | 'data.updated' | 'user.status.updated' | 'user.data.updated' | 'business.status.updated' | 'business.data.updated' | 'activity.created' | 'transaction.created' | 'transaction.status.updated';
export interface DiditWebhookEnvelope {
    webhook_type: DiditWebhookType;
    timestamp: number;
    created_at: number;
    vendor_data?: string;
    session_id?: string;
    status?: DiditSessionStatus;
    workflow_id?: string;
    metadata?: Record<string, unknown>;
    decision?: DiditDecision;
    [key: string]: unknown;
}
export interface DiditDecision {
    session_id?: string;
    session_number?: number;
    session_url?: string;
    status?: DiditSessionStatus;
    workflow_id?: string;
    features?: string[];
    vendor_data?: string;
    metadata?: Record<string, unknown>;
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
        front_image_quality_score?: {
            overall_score?: number;
        };
        back_image_quality_score?: {
            overall_score?: number;
        };
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
