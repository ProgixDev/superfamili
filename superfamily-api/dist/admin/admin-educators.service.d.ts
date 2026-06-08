import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AdminEducatorsService {
    private readonly supabaseService;
    private readonly notificationsService;
    constructor(supabaseService: SupabaseService, notificationsService: NotificationsService);
    listPendingLicenses(page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    listEducators(page?: number, limit?: number, search?: string): Promise<{
        data: {
            id: any;
            profile_id: any;
            license_status: any;
            created_at: any;
            profiles: {
                first_name: any;
                last_name: any;
                email: any;
                is_active: any;
            }[];
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    approveLicense(educatorProfileId: string, adminProfileId: string): Promise<{
        id: any;
        license_status: any;
        license_reviewed_at: any;
    }>;
    rejectLicense(educatorProfileId: string, adminProfileId: string, reason: string): Promise<{
        id: any;
        license_status: any;
        license_reviewed_at: any;
        license_rejection_reason: any;
    }>;
    private loadEducator;
}
