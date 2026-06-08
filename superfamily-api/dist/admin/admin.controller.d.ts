import { AuthUser } from '../common/interfaces/auth-user.interface';
import { AdminUsersService } from './admin-users.service';
import { AdminVerificationsService } from './admin-verifications.service';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminDisputesService } from './admin-disputes.service';
import { SupabaseService } from '../supabase/supabase.service';
export declare class AdminController {
    private readonly usersService;
    private readonly verificationsService;
    private readonly transactionsService;
    private readonly disputesService;
    private readonly supabaseService;
    constructor(usersService: AdminUsersService, verificationsService: AdminVerificationsService, transactionsService: AdminTransactionsService, disputesService: AdminDisputesService, supabaseService: SupabaseService);
    getDashboardStats(): Promise<{
        total_users: number;
        total_bookings: number;
        total_revenue_cents: any;
        active_educators: number;
    }>;
    listUsers(page?: number, limit?: number, role?: string, search?: string, isActive?: string): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    updateUserStatus(userId: string, body: {
        is_active: boolean;
    }): Promise<any>;
    listPendingVerifications(page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    updateVerification(user: AuthUser, verificationId: string, body: {
        action: 'approve' | 'reject';
        reason?: string;
    }): Promise<any>;
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
    listDisputes(page?: number, limit?: number, status?: string): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    resolveDispute(user: AuthUser, disputeId: string, body: {
        resolution_notes: string;
        resolution_type: string;
    }): Promise<any>;
}
