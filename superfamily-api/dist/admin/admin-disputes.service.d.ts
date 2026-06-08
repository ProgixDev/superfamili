import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AdminDisputesService {
    private readonly supabaseService;
    private readonly notificationsService;
    constructor(supabaseService: SupabaseService, notificationsService: NotificationsService);
    listDisputes(page?: number, limit?: number, status?: string): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    resolveDispute(disputeId: string, adminProfileId: string, resolutionNotes: string, resolutionType: string): Promise<any>;
}
