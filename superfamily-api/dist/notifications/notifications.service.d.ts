import { SupabaseService } from '../supabase/supabase.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
export declare class NotificationsService {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    create(dto: CreateNotificationDto): Promise<any>;
    findAll(profileId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    markAsRead(notificationId: string, profileId: string): Promise<any>;
    markAllAsRead(profileId: string): Promise<{
        message: string;
    }>;
}
