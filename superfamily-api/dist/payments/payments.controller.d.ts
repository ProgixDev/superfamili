import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    private readonly payoutsService;
    constructor(paymentsService: PaymentsService, payoutsService: PayoutsService);
    createPaymentIntent(user: AuthUser, dto: CreatePaymentIntentDto): Promise<{
        client_secret: string | null;
        payment_intent_id: string;
        amount_cents: any;
        currency: string;
    }>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<{
        received: boolean;
    }>;
    createConnectAccount(user: AuthUser): Promise<{
        account_id: any;
        onboarding_url: string;
    }>;
    getConnectStatus(user: AuthUser): Promise<{
        connected: boolean;
        status: null;
        charges_enabled: boolean;
        payouts_enabled: boolean;
        account_id?: undefined;
        details_submitted?: undefined;
    } | {
        connected: boolean;
        account_id: any;
        status: string;
        charges_enabled: boolean;
        payouts_enabled: boolean;
        details_submitted: boolean;
    }>;
    getPayouts(user: AuthUser, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getAnnualReport(user: AuthUser, year: number): Promise<{
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
