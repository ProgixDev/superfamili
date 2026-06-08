export interface DiditCreateSessionRequest {
    workflow_id: string;
    vendor_data?: string;
    callback?: string;
    metadata?: Record<string, unknown>;
    language?: string;
    contact_details?: {
        email?: string;
        send_notification_emails?: boolean;
        email_lang?: string;
        phone?: string;
    };
}
export interface DiditCreateSessionResponse {
    session_id: string;
    session_number: number;
    session_token: string;
    vendor_data: string | null;
    metadata: Record<string, unknown> | null;
    status: string;
    workflow_id: string;
    callback: string | null;
    url: string;
}
