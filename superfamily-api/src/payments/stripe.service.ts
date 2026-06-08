import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  public stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey || secretKey === 'sk_test_placeholder') {
      this.logger.warn(
        'Stripe secret key not configured — Stripe calls will fail',
      );
    }
    this.stripe = new Stripe(secretKey!, {
      typescript: true,
    });
  }

  // ─── Connected Accounts ───────────────────────────────────

  async createExpressAccount(
    email: string,
    name: string,
  ): Promise<Stripe.Account> {
    return this.stripe.accounts.create({
      type: 'express',
      country: 'CA',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: '8299',
        product_description:
          'Services de garde éducatifs pour enfants — SuperFamily',
      },
      metadata: {
        platform: 'superfamily',
        educator_name: name,
      },
    });
  }

  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<Stripe.AccountLink> {
    return this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }

  async getAccount(accountId: string): Promise<Stripe.Account> {
    return this.stripe.accounts.retrieve(accountId);
  }

  // ─── Customers ────────────────────────────────────────────

  async createCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
      metadata: { platform: 'superfamily', ...metadata },
    });
  }

  // ─── Payment Intents (Destination Charges) ────────────────

  async createPaymentIntent(params: {
    amountCents: number;
    customerStripeId: string;
    educatorStripeAccountId: string;
    applicationFeeAmountCents: number;
    metadata: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: 'cad',
      customer: params.customerStripeId,
      transfer_data: {
        destination: params.educatorStripeAccountId,
      },
      application_fee_amount: params.applicationFeeAmountCents,
      metadata: params.metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  /**
   * Used by the create-intent endpoint to check whether an existing
   * PaymentIntent (from a previous booking attempt) is still usable
   * before minting a new one. Returns null if Stripe doesn't recognize
   * the id (e.g. deleted in the dashboard) instead of throwing — the
   * caller will just create a fresh intent in that case.
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent | null> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return null;
    }
  }

  // ─── Refunds ──────────────────────────────────────────────

  async createRefund(
    paymentIntentId: string,
    amountCents?: number,
  ): Promise<Stripe.Refund> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    };
    if (amountCents) {
      params.amount = amountCents;
    }
    return this.stripe.refunds.create(params);
  }

  // ─── Webhook Verification ─────────────────────────────────

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
