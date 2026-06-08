import { SupabaseService } from '../supabase/supabase.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PayoutsService } from '../payments/payouts.service';
import { PaymentsService } from '../payments/payments.service';
import { EducatorsService } from '../educators/educators.service';
export declare class BookingsService {
    private readonly supabaseService;
    private readonly notificationsService;
    private readonly payoutsService;
    private readonly paymentsService;
    private readonly educatorsService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, notificationsService: NotificationsService, payoutsService: PayoutsService, paymentsService: PaymentsService, educatorsService: EducatorsService);
    create(profileId: string, dto: CreateBookingDto): Promise<any>;
    findAll(profileId: string, role: string, page?: number, limit?: number, status?: string): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(bookingId: string, profileId: string): Promise<any>;
    cancel(bookingId: string, profileId: string, dto: CancelBookingDto): Promise<any>;
    complete(bookingId: string, profileId: string): Promise<any>;
    private toRad;
}
