import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
export declare class StripeService implements OnModuleInit {
    private configService;
    stripe: Stripe;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    createExpressAccount(email: string, name: string): Promise<Stripe.Account>;
    createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<Stripe.AccountLink>;
    getAccount(accountId: string): Promise<Stripe.Account>;
    createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<Stripe.Customer>;
    createPaymentIntent(params: {
        amountCents: number;
        customerStripeId: string;
        educatorStripeAccountId: string;
        applicationFeeAmountCents: number;
        metadata: Record<string, string>;
    }): Promise<Stripe.PaymentIntent>;
    retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null>;
    createRefund(paymentIntentId: string, amountCents?: number): Promise<Stripe.Refund>;
    constructWebhookEvent(payload: Buffer, signature: string, secret: string): Stripe.Event;
}
