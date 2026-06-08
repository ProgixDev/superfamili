import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentsService } from '../consents/consents.service';
import { DiditSignatureVerifier } from './didit-signature.verifier';
export interface KycVerification {
    id: string;
    user_id: string;
    didit_session_id: string | null;
    didit_session_url: string | null;
    status: 'not_started' | 'in_progress' | 'approved' | 'declined' | 'expired' | 'review_required';
    confidence_score: number | null;
    decision: string | null;
    id_document_type: string | null;
    id_document_country: string | null;
    extracted_full_name: string | null;
    extracted_date_of_birth: string | null;
    extracted_document_number: string | null;
    raw_webhook_payload: unknown;
    expires_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface KycStatusResponse {
    status: KycVerification['status'];
    confidence_score: number | null;
    decision: string | null;
    completed_at: string | null;
    didit_session_url: string | null;
}
export declare const KYC_STATUS_CHANGED_EVENT = "kyc.status.changed";
export interface KycStatusChangedEvent {
    userId: string;
    status: KycVerification['status'];
    confidenceScore: number | null;
}
export declare class KycService {
    private readonly configService;
    private readonly supabaseService;
    private readonly signatureVerifier;
    private readonly eventEmitter;
    private readonly consentsService;
    private readonly logger;
    constructor(configService: ConfigService, supabaseService: SupabaseService, signatureVerifier: DiditSignatureVerifier, eventEmitter: EventEmitter2, consentsService: ConsentsService);
    createSession(userId: string): Promise<{
        sessionId: string;
        verificationUrl: string;
        expiresAt: Date | null;
    }>;
    getSessionStatus(userId: string): Promise<KycVerification | null>;
    pollStatus(userId: string): Promise<KycStatusResponse>;
    handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<void>;
    private mapDiditStatus;
    private isTerminal;
    private extractDecisionFields;
    private updateEducatorMirror;
    private emitStatusChanged;
}
