import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AdminVerificationsService {
    private readonly supabaseService;
    private readonly notificationsService;
    constructor(supabaseService: SupabaseService, notificationsService: NotificationsService);
    listPending(page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    approve(verificationId: string, adminProfileId: string): Promise<any>;
    reject(verificationId: string, adminProfileId: string, reason: string): Promise<any>;
}
