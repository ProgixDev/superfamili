import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { PayoutsService } from '../payments/payouts.service';
import { PaymentsService } from '../payments/payments.service';
import { StripeService } from '../payments/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly payoutsService: PayoutsService,
    // Used by cleanupStaleBookings to replay missed Stripe webhooks
    // before declaring a booking abandoned.
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Process pending payouts every Friday at 10:00 AM ET
  @Cron('0 10 * * 5', { timeZone: 'America/Toronto' })
  async processPayouts() {
    this.logger.log('Traitement des paiements en attente...');
    const results = await this.payoutsService.processPendingPayouts();
    this.logger.log(
      `Paiements traités: ${results.length} (complétés: ${results.filter((r) => r.status === 'completed').length})`,
    );
  }

  // Send booking reminders 24h before — runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async sendBookingReminders() {
    const supabase = this.supabaseService.getServiceClient();

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: upcomingBookings } = await supabase
      .from('bookings')
      .select(
        'id, parent_profile_id, educator_profile_id, booking_date_start, parent_profiles(profile_id), educator_profiles(profile_id)',
      )
      .eq('status', 'confirmed')
      .gte('booking_date_start', in24h.toISOString())
      .lt('booking_date_start', in25h.toISOString());

    if (!upcomingBookings || upcomingBookings.length === 0) return;

    for (const booking of upcomingBookings) {
      const parentProfileId = (booking as any).parent_profiles?.profile_id;
      const educatorProfileId = (booking as any).educator_profiles?.profile_id;

      if (parentProfileId) {
        await this.notificationsService.create({
          profile_id: parentProfileId,
          notification_type: 'booking_reminder',
          title: 'Rappel de réservation',
          message: 'Votre réservation est prévue dans 24 heures.',
          related_booking_id: booking.id,
        });
      }

      if (educatorProfileId) {
        await this.notificationsService.create({
          profile_id: educatorProfileId,
          notification_type: 'booking_reminder',
          title: 'Rappel de réservation',
          message: 'Vous avez une réservation prévue dans 24 heures.',
          related_booking_id: booking.id,
        });
      }
    }

    this.logger.log(
      `Rappels envoyés pour ${upcomingBookings.length} réservation(s)`,
    );
  }

  // Reconcile stale pending_payment bookings (> 30 min old).
  //
  // For each one:
  //   1. Look at the most recent PaymentIntent we created on Stripe.
  //   2. If Stripe says it succeeded, the parent did pay but the
  //      `payment_intent.succeeded` webhook never reached us — replay
  //      it ourselves so the booking flips to `confirmed` and the
  //      educator/parent get the usual notifications. Without this
  //      check we'd cancel a paid booking and silently leave the
  //      parent with a Stripe charge for nothing.
  //   3. Otherwise the parent really did abandon the flow — cancel
  //      so the time slot frees up and the educator's cap clears.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupStaleBookings() {
    const supabase = this.supabaseService.getServiceClient();

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Pull the latest payment row alongside each booking so we have
    // the PaymentIntent id to ask Stripe about. Bookings without any
    // payment row at all skip straight to cancellation.
    const { data: staleBookings, error: queryError } = await supabase
      .from('bookings')
      .select('id, payments(stripe_payment_intent_id, created_at)')
      .eq('status', 'pending_payment')
      .lt('created_at', thirtyMinAgo);

    if (queryError) {
      this.logger.error(
        `Stale-booking query failed: ${queryError.message}`,
      );
      return;
    }

    if (!staleBookings || staleBookings.length === 0) return;

    let recovered = 0;
    let cancelled = 0;
    const idsToCancel: string[] = [];

    for (const booking of staleBookings as Array<{
      id: string;
      payments?: Array<{
        stripe_payment_intent_id: string | null;
        created_at: string;
      }>;
    }>) {
      // Pick the most recent PaymentIntent for this booking.
      const latestPayment = (booking.payments ?? [])
        .filter((p) => p.stripe_payment_intent_id)
        .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];

      if (latestPayment?.stripe_payment_intent_id) {
        try {
          const intent = await this.stripeService.retrievePaymentIntent(
            latestPayment.stripe_payment_intent_id,
          );
          if (intent && intent.status === 'succeeded') {
            // Replay the webhook locally — handlePaymentSuccess is
            // idempotent (it scopes the bookings.update by status =
            // 'pending_payment') so a real webhook arriving later is
            // a no-op.
            await this.paymentsService.handlePaymentSuccess(intent);
            recovered++;
            this.logger.log(
              `Recovered booking ${booking.id} from missed webhook (intent ${intent.id})`,
            );
            continue;
          }
        } catch (err) {
          this.logger.warn(
            `Stripe lookup failed for booking ${booking.id}: ${err instanceof Error ? err.message : err}`,
          );
          // Fall through to cancel — better than leaving it stuck.
        }
      }

      idsToCancel.push(booking.id);
    }

    if (idsToCancel.length > 0) {
      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Paiement non reçu dans les 30 minutes',
          cancelled_at: new Date().toISOString(),
        })
        .in('id', idsToCancel);
      cancelled = idsToCancel.length;
    }

    this.logger.log(
      `Cleanup stale bookings: ${recovered} recovered (paid but webhook missed), ${cancelled} cancelled (truly abandoned)`,
    );
  }

  // Check for expired verifications — daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredVerifications() {
    const supabase = this.supabaseService.getServiceClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: expired } = await supabase
      .from('educator_verifications')
      .select('id, educator_profile_id')
      .eq('status', 'verified')
      .lt('expiry_date', today)
      .not('expiry_date', 'is', null);

    if (!expired || expired.length === 0) return;

    const ids = expired.map((v) => v.id);
    await supabase
      .from('educator_verifications')
      .update({ status: 'expired' })
      .in('id', ids);

    // Notify educators
    for (const verification of expired) {
      const { data: edProfile } = await supabase
        .from('educator_profiles')
        .select('profile_id')
        .eq('id', verification.educator_profile_id)
        .single();

      if (edProfile) {
        await this.notificationsService.create({
          profile_id: edProfile.profile_id,
          notification_type: 'profile_verification_status',
          title: 'Vérification expirée',
          message:
            'Un de vos documents de vérification a expiré. Veuillez le renouveler.',
        });
      }
    }

    this.logger.log(
      `${expired.length} vérification(s) marquée(s) comme expirée(s)`,
    );
  }
}
