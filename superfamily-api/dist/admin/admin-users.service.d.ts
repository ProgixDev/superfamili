import { SupabaseService } from '../supabase/supabase.service';
export declare class AdminUsersService {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    listUsers(page?: number, limit?: number, role?: string, search?: string, isActive?: boolean): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    updateUserStatus(userId: string, isActive: boolean): Promise<any>;
}
