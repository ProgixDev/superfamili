import { SupabaseService } from '../supabase/supabase.service';
export declare class AdminTransactionsService {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    listTransactions(page?: number, limit?: number, status?: string, dateFrom?: string, dateTo?: string): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getCommissionSummary(period?: string): Promise<{
        total_revenue: any;
        total_subtotal: any;
        total_commission: any;
        total_educator_earnings: any;
        total_mileage_fees: any;
        booking_count: number;
        period: string;
    }>;
}
