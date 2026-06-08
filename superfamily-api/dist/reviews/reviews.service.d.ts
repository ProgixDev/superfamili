import { SupabaseService } from '../supabase/supabase.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ReviewsService {
    private readonly supabaseService;
    private readonly notificationsService;
    constructor(supabaseService: SupabaseService, notificationsService: NotificationsService);
    create(profileId: string, dto: CreateReviewDto): Promise<any>;
    findByEducator(educatorProfileId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
