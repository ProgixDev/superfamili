import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class PayoutsService {
    private readonly supabaseService;
    private readonly notificationsService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, notificationsService: NotificationsService);
    createPayoutRecord(bookingId: string): Promise<void>;
    processPendingPayouts(): Promise<any[]>;
    getEducatorPayouts(profileId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getAnnualReport(profileId: string, year: number): Promise<{
        year: number;
        educator: {
            name: string;
            email: any;
        };
        summary: {
            total_gross_cents: number;
            total_platform_fees_cents: number;
            total_net_earnings_cents: number;
            total_bookings: number;
        };
        monthly_breakdown: {
            month: number;
            month_name: string;
            gross_amount_cents: number;
            platform_fee_cents: number;
            net_amount_cents: number;
            booking_count: number;
        }[];
        transactions: {
            id: any;
            gross_amount_cents: any;
            platform_fee_cents: any;
            net_amount_cents: any;
            status: any;
            created_at: any;
            booking_id: any;
        }[];
        generated_at: string;
        disclaimer: string;
    }>;
}
