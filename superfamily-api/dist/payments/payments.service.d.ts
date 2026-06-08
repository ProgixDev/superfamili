import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class PaymentsService {
    private readonly stripeService;
    private readonly configService;
    private readonly supabaseService;
    private readonly notificationsService;
    private readonly logger;
    constructor(stripeService: StripeService, configService: ConfigService, supabaseService: SupabaseService, notificationsService: NotificationsService);
    createConnectAccount(profileId: string): Promise<{
        account_id: any;
        onboarding_url: string;
    }>;
    getConnectStatus(profileId: string): Promise<{
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
    createPaymentIntent(bookingId: string, parentProfileId: string): Promise<{
        client_secret: string | null;
        payment_intent_id: string;
        amount_cents: any;
        currency: string;
    }>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<{
        received: boolean;
    }>;
    processRefund(bookingId: string, amountCents?: number): Promise<{
        refund_id: string;
        amount_refunded: number;
        status: string | null;
    }>;
    handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void>;
    private handlePaymentFailed;
    private handleAccountUpdated;
    private handleChargeRefunded;
    private handleTransferCreated;
}
