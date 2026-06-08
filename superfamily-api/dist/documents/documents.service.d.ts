import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConsentsService } from '../consents/consents.service';
export type DocumentType = 'background_check' | 'birth_certificate' | 'cpr_certification' | 'work_authorization' | 'secondary_id' | 'diploma';
export type DocumentStatus = 'pending_review' | 'approved' | 'rejected' | 'expired';
export interface DocumentRow {
    id: string;
    educator_id: string;
    document_type: DocumentType;
    file_url: string;
    file_size_bytes: number;
    mime_type: string;
    status: DocumentStatus;
    issued_date: string | null;
    expires_at: string | null;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
    signed_url?: string | null;
}
export declare const EXPIRY_WARNING_WINDOW_DAYS = 30;
export declare class DocumentsService {
    private readonly supabaseService;
    private readonly notificationsService;
    private readonly consentsService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, notificationsService: NotificationsService, consentsService: ConsentsService);
    uploadDocument(profileId: string, file: Express.Multer.File | undefined, body: {
        type: DocumentType;
        issued_date?: string;
    }): Promise<DocumentRow>;
    listMine(profileId: string): Promise<DocumentRow[]>;
    deleteMine(profileId: string, documentId: string): Promise<void>;
    listForAdmin(params: {
        status?: DocumentStatus;
        type?: DocumentType;
        page?: number;
        limit?: number;
    }): Promise<{
        data: DocumentRow[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    approve(documentId: string, adminProfileId: string): Promise<DocumentRow>;
    reject(documentId: string, adminProfileId: string, reason: string): Promise<DocumentRow>;
    findExpiringSoon(): Promise<DocumentRow[]>;
    findNewlyExpired(): Promise<DocumentRow[]>;
    markExpired(ids: string[]): Promise<void>;
    notifyEducatorForDocument(row: DocumentRow, title: string, message: string): Promise<void>;
    private validateFile;
    private pickExtension;
    private computeExpiresAt;
    private attachSignedUrls;
    private resolveEducatorId;
    private loadForAdminAction;
    private notifyEducator;
    private documentTypeLabel;
}
