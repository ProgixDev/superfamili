import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Create Payout Record (after service completion) ──────

  async createPayoutRecord(bookingId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: booking } = await supabase
      .from('bookings')
      .select(
        '*, educator_profiles!educator_profiles_profile_id_fkey(stripe_account_id)',
      )
      .eq('id', bookingId)
      .single();

    if (!booking) return;

    // Schedule payout 7 days after completion
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 7);

    await supabase.from('payouts').insert({
      educator_profile_id: booking.educator_profile_id,
      booking_id: bookingId,
      stripe_account_id: booking.educator_profiles.stripe_account_id,
      gross_amount_cents: booking.subtotal_cents,
      platform_fee_cents: booking.platform_commission_cents,
      net_amount_cents: booking.educator_earnings_cents,
      currency: 'CAD',
      status: 'pending',
      service_completion_date: new Date().toISOString().split('T')[0],
      payout_scheduled_date: scheduledDate.toISOString().split('T')[0],
    });

    this.logger.log(`Payout record created for booking ${bookingId}`);
  }

  // ─── Process Pending Payouts ──────────────────────────────
  // With destination charges, the transfer already happened at payment time.
  // This cron just marks our records as completed once the hold period passes.

  async processPendingPayouts() {
    const supabase = this.supabaseService.getServiceClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: payouts } = await supabase
      .from('payouts')
      .select('*, educator_profiles(profile_id)')
      .eq('status', 'pending')
      .lte('payout_scheduled_date', today);

    if (!payouts || payouts.length === 0) {
      this.logger.log('No pending payouts to process');
      return [];
    }

    const results: any[] = [];

    for (const payout of payouts) {
      try {
        await supabase
          .from('payouts')
          .update({
            status: 'completed',
            payout_completed_date: today,
          })
          .eq('id', payout.id);

        // Notify educator
        const edProfileId = payout.educator_profiles?.profile_id;
        if (edProfileId) {
          await this.notificationsService.create({
            profile_id: edProfileId,
            notification_type: 'payout_completed',
            title: 'Paiement reçu',
            message: `Votre paiement de ${(payout.net_amount_cents / 100).toFixed(2)} $ CAD a été traité.`,
            related_booking_id: payout.booking_id,
          });
        }

        results.push({ payout_id: payout.id, status: 'completed' });
        this.logger.log(`Payout ${payout.id} completed`);
      } catch (err: any) {
        await supabase
          .from('payouts')
          .update({ status: 'failed', reason_held: err.message })
          .eq('id', payout.id);

        results.push({
          payout_id: payout.id,
          status: 'failed',
          error: err.message,
        });
      }
    }

    return results;
  }

  // ─── Get Educator Payouts ─────────────────────────────────

  async getEducatorPayouts(profileId: string, page = 1, limit = 20) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    const { data: educatorProfile } = await supabase
      .from('educator_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (!educatorProfile) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    const { data, count } = await supabase
      .from('payouts')
      .select('*, bookings(booking_date_start, services(name))', {
        count: 'exact',
      })
      .eq('educator_profile_id', educatorProfile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return {
      data: data || [],
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  // ─── Annual Revenue Report ────────────────────────────────

  async getAnnualReport(profileId: string, year: number) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: educatorProfile } = await supabase
      .from('educator_profiles')
      .select(
        'id, profiles!educator_profiles_profile_id_fkey(first_name, last_name, email)',
      )
      .eq('profile_id', profileId)
      .single();

    if (!educatorProfile) {
      throw new BadRequestException('Profil educateur non trouve');
    }

    const startDate = `${year}-01-01T00:00:00`;
    const endDate = `${year}-12-31T23:59:59`;

    const { data: payouts, error } = await supabase
      .from('payouts')
      .select(
        'id, gross_amount_cents, platform_fee_cents, net_amount_cents, status, created_at, booking_id',
      )
      .eq('educator_profile_id', educatorProfile.id)
      .in('status', ['paid', 'completed'])
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la recuperation des donnees',
      );
    }

    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      month_name: new Date(year, i).toLocaleDateString('fr-CA', {
        month: 'long',
      }),
      gross_amount_cents: 0,
      platform_fee_cents: 0,
      net_amount_cents: 0,
      booking_count: 0,
    }));

    let totalGross = 0;
    let totalFees = 0;
    let totalNet = 0;
    let totalBookings = 0;

    for (const payout of payouts || []) {
      const month = new Date(payout.created_at).getMonth();
      monthlyBreakdown[month].gross_amount_cents +=
        payout.gross_amount_cents || 0;
      monthlyBreakdown[month].platform_fee_cents +=
        payout.platform_fee_cents || 0;
      monthlyBreakdown[month].net_amount_cents += payout.net_amount_cents || 0;
      monthlyBreakdown[month].booking_count += 1;

      totalGross += payout.gross_amount_cents || 0;
      totalFees += payout.platform_fee_cents || 0;
      totalNet += payout.net_amount_cents || 0;
      totalBookings += 1;
    }

    const profile = (educatorProfile as any).profiles;

    return {
      year,
      educator: {
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
      },
      summary: {
        total_gross_cents: totalGross,
        total_platform_fees_cents: totalFees,
        total_net_earnings_cents: totalNet,
        total_bookings: totalBookings,
      },
      monthly_breakdown: monthlyBreakdown,
      transactions: payouts || [],
      generated_at: new Date().toISOString(),
      disclaimer:
        "Ce document est un releve de revenus genere par SuperFamily. Il ne constitue pas un document fiscal officiel. Consultez un comptable pour vos declarations d'impots.",
    };
  }
}
