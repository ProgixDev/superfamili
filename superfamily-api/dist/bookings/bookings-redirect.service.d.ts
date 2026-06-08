import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class BookingsRedirectService {
    private readonly supabaseService;
    private readonly notificationsService;
    constructor(supabaseService: SupabaseService, notificationsService: NotificationsService);
    findReplacementEducators(bookingId: string): Promise<any[]>;
}
