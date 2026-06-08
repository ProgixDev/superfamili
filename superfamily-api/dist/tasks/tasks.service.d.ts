import { SupabaseService } from '../supabase/supabase.service';
import { PayoutsService } from '../payments/payouts.service';
import { PaymentsService } from '../payments/payments.service';
import { StripeService } from '../payments/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class TasksService {
    private readonly supabaseService;
    private readonly payoutsService;
    private readonly paymentsService;
    private readonly stripeService;
    private readonly notificationsService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, payoutsService: PayoutsService, paymentsService: PaymentsService, stripeService: StripeService, notificationsService: NotificationsService);
    processPayouts(): Promise<void>;
    sendBookingReminders(): Promise<void>;
    cleanupStaleBookings(): Promise<void>;
    checkExpiredVerifications(): Promise<void>;
}
