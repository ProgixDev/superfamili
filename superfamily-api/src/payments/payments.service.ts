import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Create Stripe Connect Account for Educator ───────────

  async createConnectAccount(profileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: educatorProfile } = await supabase
      .from('educator_profiles')
      .select(
        'id, stripe_account_id, profiles!educator_profiles_profile_id_fkey(email, first_name, last_name)',
      )
      .eq('profile_id', profileId)
      .single();

    if (!educatorProfile) {
      throw new NotFoundException("Profil d'éducateur non trouvé");
    }

    const profile = (educatorProfile as any).profiles;
    const fullName = `${profile.first_name} ${profile.last_name}`;
    const frontendUrl =
      this.configService.get<string>('frontendUrl') || 'http://localhost:3000';

    // If account already exists, return a new onboarding link
    if (educatorProfile.stripe_account_id) {
      const accountLink = await this.stripeService.createAccountLink(
        educatorProfile.stripe_account_id,
        `${frontendUrl}/educateur/onboarding/stripe/refresh`,
        `${frontendUrl}/educateur/onboarding/stripe/complete`,
      );
      return {
        account_id: educatorProfile.stripe_account_id,
        onboarding_url: accountLink.url,
      };
    }

    // Create new Express account
    let account;
    try {
      account = await this.stripeService.createExpressAccount(
        profile.email,
        fullName,
      );
    } catch (err: any) {
      this.logger.error(`Stripe account creation failed: ${err.message}`);
      throw new BadRequestException(
        err.message || 'Erreur lors de la création du compte Stripe',
      );
    }

    // Save to DB
    await supabase
      .from('educator_profiles')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: 'pending',
      })
      .eq('id', educatorProfile.id);

    // Generate onboarding link
    const accountLink = await this.stripeService.createAccountLink(
      account.id,
      `${frontendUrl}/educateur/onboarding/stripe/refresh`,
      `${frontendUrl}/educateur/onboarding/stripe/complete`,
    );

    return {
      account_id: account.id,
      onboarding_url: accountLink.url,
    };
  }

  // ─── Get Connect Account Status ───────────────────────────

  async getConnectStatus(profileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: educatorProfile } = await supabase
      .from('educator_profiles')
      .select(
        'stripe_account_id, stripe_account_status, banking_details_verified',
      )
      .eq('profile_id', profileId)
      .single();

    if (!educatorProfile?.stripe_account_id) {
      return {
        connected: false,
        status: null,
        charges_enabled: false,
        payouts_enabled: false,
      };
    }

    // Fetch fresh status from Stripe
    const account = await this.stripeService.getAccount(
      educatorProfile.stripe_account_id,
    );

    const newStatus = account.charges_enabled ? 'active' : 'pending';
    if (newStatus !== educatorProfile.stripe_account_status) {
      await supabase
        .from('educator_profiles')
        .update({
          stripe_account_status: newStatus,
          banking_details_verified:
            account.charges_enabled && account.payouts_enabled,
        })
        .eq('stripe_account_id', account.id);
    }

    return {
      connected: true,
      account_id: educatorProfile.stripe_account_id,
      status: newStatus,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    };
  }

  // ─── Create PaymentIntent (Destination Charge) ────────────

  async createPaymentIntent(bookingId: string, parentProfileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    // Get booking with educator Stripe info and parent info.
    //
    // NOTE: don't add an FK-name hint here. The previous version pasted
    // `educator_profiles_profile_id_fkey` onto both the parent_profiles
    // and the inner profiles relation — neither of which actually has
    // that constraint name — and PostgREST silently failed the join,
    // making `booking` come back null and the call surface as a 404
    // ("Réservation non trouvée") to the parent. Both of these joins
    // are unambiguous (single FK from `bookings` → `parent_profiles`,
    // and from `parent_profiles` → `profiles`), so we let PostgREST
    // pick the relationship implicitly, exactly like
    // `bookings.service.ts` and `reviews.service.ts` do.
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(
        `*,
        educator_profiles(stripe_account_id, stripe_account_status),
        parent_profiles(id, stripe_customer_id, profile_id, profiles(email, first_name, last_name))`,
      )
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new NotFoundException('Réservation non trouvée');
    }

    if (booking.status !== 'pending_payment') {
      throw new BadRequestException(
        `Réservation en statut "${booking.status}" — paiement impossible`,
      );
    }

    // Validate educator has active Stripe account
    const educatorStripeId = booking.educator_profiles.stripe_account_id;
    if (
      !educatorStripeId ||
      booking.educator_profiles.stripe_account_status !== 'active'
    ) {
      throw new BadRequestException(
        "L'éducateur n'a pas complété son inscription Stripe",
      );
    }

    // Get or create Stripe Customer for parent
    const parentData = booking.parent_profiles;
    const parentProfile = parentData.profiles;
    let stripeCustomerId = parentData.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(
        parentProfile.email,
        `${parentProfile.first_name} ${parentProfile.last_name}`,
        { parent_profile_id: booking.parent_profile_id },
      );
      stripeCustomerId = customer.id;

      await supabase
        .from('parent_profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', booking.parent_profile_id);
    }

    // application_fee = platform commission + mileage fee
    const applicationFee =
      booking.platform_commission_cents + (booking.mileage_fee_cents || 0);

    // ─── Idempotency: reuse a usable existing PaymentIntent ──
    // When a parent retries the payment step (refresh, network blip,
    // even just navigating back into the flow with the same booking),
    // we'd otherwise mint a fresh PaymentIntent on Stripe each time
    // and leave orphans. If we already have a `pending` payment row
    // for this booking and Stripe still considers the intent usable
    // (no payment method attached yet, or one is attached but the
    // user hasn't confirmed), return its existing client_secret so
    // the browser binds back to the same intent.
    const REUSABLE_STATUSES = new Set([
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
    ]);
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('stripe_payment_intent_id, amount_cents')
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment?.stripe_payment_intent_id) {
      const existingIntent = await this.stripeService.retrievePaymentIntent(
        existingPayment.stripe_payment_intent_id,
      );
      if (
        existingIntent &&
        REUSABLE_STATUSES.has(existingIntent.status) &&
        existingIntent.amount === booking.total_amount_cents
      ) {
        this.logger.log(
          `Reusing PaymentIntent ${existingIntent.id} for booking ${bookingId} (status=${existingIntent.status})`,
        );
        return {
          client_secret: existingIntent.client_secret,
          payment_intent_id: existingIntent.id,
          amount_cents: booking.total_amount_cents,
          currency: 'cad',
        };
      }
    }

    // Create PaymentIntent with destination charge
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amountCents: booking.total_amount_cents,
      customerStripeId: stripeCustomerId,
      educatorStripeAccountId: educatorStripeId,
      applicationFeeAmountCents: applicationFee,
      metadata: {
        booking_id: bookingId,
        parent_profile_id: booking.parent_profile_id,
        educator_profile_id: booking.educator_profile_id,
        subtotal_cents: String(booking.subtotal_cents),
        commission_cents: String(booking.platform_commission_cents),
        mileage_fee_cents: String(booking.mileage_fee_cents || 0),
      },
    });

    // Insert payment record
    await supabase.from('payments').insert({
      booking_id: bookingId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: booking.total_amount_cents,
      currency: 'CAD',
      status: 'pending',
      metadata: {
        application_fee_amount: applicationFee,
        educator_stripe_account_id: educatorStripeId,
      },
    });

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_cents: booking.total_amount_cents,
      currency: 'cad',
    };
  }

  // ─── Webhook Handler ──────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    )!;

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException('Signature de webhook invalide');
    }

    this.logger.log(`Webhook received: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object);
        break;
      case 'transfer.created':
        await this.handleTransferCreated(event.data.object);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  // ─── Process Refund ───────────────────────────────────────

  async processRefund(bookingId: string, amountCents?: number) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: payment } = await supabase
      .from('payments')
      .select('stripe_payment_intent_id, status, amount_cents')
      .eq('booking_id', bookingId)
      .eq('status', 'completed')
      .single();

    if (!payment) {
      throw new NotFoundException(
        'Aucun paiement complété pour cette réservation',
      );
    }

    const refund = await this.stripeService.createRefund(
      payment.stripe_payment_intent_id,
      amountCents,
    );

    return {
      refund_id: refund.id,
      amount_refunded: refund.amount,
      status: refund.status,
    };
  }

  // ─── Webhook Handlers (also used by the stale-booking cron) ─────

  // Made public so TasksService can replay this idempotently when it
  // catches a paid-but-never-confirmed booking (typical when the
  // Stripe webhook didn't reach this server). Executes the same
  // bookings.status → 'confirmed' update + notifications path.
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const supabase = this.supabaseService.getServiceClient();
    const bookingId = paymentIntent.metadata?.booking_id;
    if (!bookingId) {
      this.logger.warn(
        'PaymentIntent succeeded without booking_id in metadata',
      );
      return;
    }

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        stripe_charge_id: paymentIntent.latest_charge as string,
        payment_method: paymentIntent.payment_method_types?.[0] || 'card',
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    // Auto-confirm booking
    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .eq('status', 'pending_payment');

    // Notifications
    const { data: booking } = await supabase
      .from('bookings')
      .select(
        'parent_profile_id, educator_profile_id, booking_date_start, educator_profiles(profile_id), parent_profiles(profile_id)',
      )
      .eq('id', bookingId)
      .single();

    if (booking) {
      const edProfileId = (booking as any).educator_profiles?.profile_id;
      const parentProfileId = (booking as any).parent_profiles?.profile_id;

      if (edProfileId) {
        await this.notificationsService.create({
          profile_id: edProfileId,
          notification_type: 'booking_confirmed',
          title: 'Nouvelle réservation confirmée',
          message: `Une réservation a été confirmée pour le ${new Date(booking.booking_date_start).toLocaleDateString('fr-CA')}.`,
          related_booking_id: bookingId,
        });
      }
      if (parentProfileId) {
        await this.notificationsService.create({
          profile_id: parentProfileId,
          notification_type: 'payment_received',
          title: 'Réservation confirmée',
          message:
            'Votre paiement a été confirmé et la réservation est active.',
          related_booking_id: bookingId,
        });
      }
    }

    this.logger.log(
      `Booking ${bookingId} confirmed via payment ${paymentIntent.id}`,
    );
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const supabase = this.supabaseService.getServiceClient();
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    this.logger.warn(
      `Payment failed for booking ${paymentIntent.metadata?.booking_id}: ${paymentIntent.last_payment_error?.message}`,
    );
  }

  private async handleAccountUpdated(account: Stripe.Account) {
    const supabase = this.supabaseService.getServiceClient();
    const newStatus = account.charges_enabled ? 'active' : 'pending';
    const bankingVerified = account.charges_enabled && account.payouts_enabled;

    await supabase
      .from('educator_profiles')
      .update({
        stripe_account_status: newStatus,
        banking_details_verified: bankingVerified,
      })
      .eq('stripe_account_id', account.id);

    this.logger.log(
      `Stripe account ${account.id} updated: status=${newStatus}`,
    );
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: payment } = await supabase
      .from('payments')
      .select('id, booking_id')
      .eq('stripe_charge_id', charge.id)
      .single();

    if (!payment) {
      this.logger.warn(
        `Charge refunded but no payment found for charge ${charge.id}`,
      );
      return;
    }

    const isFullRefund = charge.amount_refunded === charge.amount;

    if (isFullRefund) {
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', payment.id);

      await supabase
        .from('bookings')
        .update({
          status: 'refunded',
          refund_amount_cents: charge.amount_refunded,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', payment.booking_id);
    } else {
      await supabase
        .from('bookings')
        .update({ refund_amount_cents: charge.amount_refunded })
        .eq('id', payment.booking_id);
    }

    this.logger.log(
      `Charge ${charge.id} refunded: ${charge.amount_refunded}/${charge.amount} cents`,
    );
  }

  private async handleTransferCreated(transfer: Stripe.Transfer) {
    const supabase = this.supabaseService.getServiceClient();

    if (transfer.destination && transfer.source_transaction) {
      const { data: payment } = await supabase
        .from('payments')
        .select('booking_id')
        .eq('stripe_charge_id', transfer.source_transaction as string)
        .single();

      if (payment) {
        await supabase
          .from('payouts')
          .update({ stripe_payout_id: transfer.id })
          .eq('booking_id', payment.booking_id);
      }
    }

    this.logger.log(
      `Transfer ${transfer.id} created: ${transfer.amount} cents to ${transfer.destination}`,
    );
  }
}
