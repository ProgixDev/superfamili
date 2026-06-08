import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { calculateBookingPricing } from '../common/utils/pricing.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PayoutsService } from '../payments/payouts.service';
import { PaymentsService } from '../payments/payments.service';
import { EducatorsService } from '../educators/educators.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly payoutsService: PayoutsService,
    private readonly paymentsService: PaymentsService,
    private readonly educatorsService: EducatorsService,
  ) {}

  async create(profileId: string, dto: CreateBookingDto) {
    // Defense-in-depth: SupabaseAuthGuard should have already rejected any
    // authenticated request without a profile, but double-check here so a
    // misconfigured guard can't silently surface as a cryptic 403 downstream.
    if (!profileId) {
      this.logger.error(
        'BookingsService.create called with no profileId — guard misconfigured',
      );
      throw new UnauthorizedException(
        'Profil utilisateur introuvable. Veuillez vous reconnecter.',
      );
    }

    const supabase = this.supabaseService.getServiceClient();

    // Look up the parent_profiles row for this profile. `.maybeSingle()`
    // returns `null` for missing rows and throws for real DB errors, so we
    // can give the caller a meaningful message in each case.
    const { data: parentProfile, error: parentError } = await supabase
      .from('parent_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (parentError) {
      this.logger.error(
        `parent_profiles lookup failed for profile ${profileId}: ${parentError.message}`,
      );
      throw new BadRequestException(
        'Erreur lors de la vérification du profil parent.',
      );
    }

    if (!parentProfile) {
      // User is authenticated with a valid profile, but has no parent role
      // profile. This means they signed up as an educator (or signup half-
      // completed) — they literally cannot create bookings. 403 with a
      // message that points at the real cause.
      throw new ForbiddenException(
        'Aucun profil parent associé à ce compte. Seuls les comptes parents peuvent créer des réservations.',
      );
    }

    // ─── Idempotency: reuse a recent pending_payment row ────
    // Without this, every retry of the "Passer au paiement" button
    // (for any reason — flaky network, dev restart, payment intent
    // failure) inserts a fresh booking row. That fills the parent's
    // history with orphan "Pending payment" entries and inflates the
    // educator's overlap count for the cap check. If the same parent
    // requested the same {educator, service, slot} in the last 30
    // minutes and didn't yet pay, hand them back the existing row so
    // the next call to /payments/create-intent generates a fresh
    // PaymentIntent against it instead of duplicating the booking.
    const dedupWindowAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existingPending } = await supabase
      .from('bookings')
      .select('*')
      .eq('parent_profile_id', parentProfile.id)
      .eq('educator_profile_id', dto.educator_profile_id)
      .eq('service_id', dto.service_id)
      .eq('booking_date_start', dto.booking_date_start)
      .eq('booking_date_end', dto.booking_date_end)
      .eq('status', 'pending_payment')
      .gte('created_at', dedupWindowAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingPending && existingPending.length > 0) {
      this.logger.log(
        `Reusing pending booking ${existingPending[0].id} (dedup) for parent ${parentProfile.id}`,
      );
      return existingPending[0];
    }

    // Get educator service and rate
    const { data: educatorService } = await supabase
      .from('educator_services')
      .select('hourly_rate_cents')
      .eq('educator_profile_id', dto.educator_profile_id)
      .eq('service_id', dto.service_id)
      .eq('is_active', true)
      .single();

    if (!educatorService) {
      throw new BadRequestException(
        "Ce service n'est pas offert par cet éducateur",
      );
    }

    // Calculate distance
    const { data: parentLocation } = await supabase
      .from('profiles')
      .select('postal_code')
      .eq('id', profileId)
      .single();

    const { data: educatorProfile } = await supabase
      .from('educator_profiles')
      .select(
        'profile_id, profiles!educator_profiles_profile_id_fkey(postal_code)',
      )
      .eq('id', dto.educator_profile_id)
      .single();

    let distanceKm = 0;
    if (
      parentLocation?.postal_code &&
      (educatorProfile as any)?.profiles?.postal_code
    ) {
      // Calculate distance between postal codes
      const { data: locations } = await supabase
        .from('postal_codes')
        .select('postal_code, latitude, longitude')
        .in('postal_code', [
          dto.location_postal_code,
          (educatorProfile as any).profiles.postal_code,
        ]);

      if (locations && locations.length === 2) {
        const R = 6371;
        const dLat = this.toRad(locations[1].latitude - locations[0].latitude);
        const dLon = this.toRad(
          locations[1].longitude - locations[0].longitude,
        );
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(this.toRad(locations[0].latitude)) *
            Math.cos(this.toRad(locations[1].latitude)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = R * c;
      }
    }

    // Get platform settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .single();

    const commissionPercent = settings?.platform_commission_percentage || 30;
    const freeMileageKm = settings?.free_mileage_km || 20;
    const mileageFeePerKm = settings?.mileage_fee_per_km_cents || 100;

    // Calculate pricing
    const pricing = calculateBookingPricing({
      hourlyRateCents: educatorService.hourly_rate_cents,
      durationHours: dto.duration_hours,
      distanceKm,
      platformCommissionPercent: commissionPercent,
      freeMileageKm,
      mileageFeePerKmCents: mileageFeePerKm,
    });

    // Resolve location coordinates
    const { data: locationData } = await supabase
      .from('postal_codes')
      .select('latitude, longitude')
      .eq('postal_code', dto.location_postal_code)
      .single();

    // ─── Quebec child-cap enforcement ────────────────────────
    // Every educator has a maximum number of simultaneous children they may
    // supervise, governed by their Quebec government license tier. Before
    // inserting this booking, count the children already booked for this
    // educator in overlapping time windows, add this booking's child, and
    // reject if the total exceeds the cap.
    //
    // Overlap rule: existing.start < new.end AND existing.end > new.start.
    // Only `confirmed`, `pending_payment`, and `in_progress` reservations
    // count toward the cap — `cancelled`, `completed`, and `refunded` don't.
    const maxChildren = await this.educatorsService.getMaxChildrenForEducator(
      dto.educator_profile_id,
    );

    const { data: overlapping, error: overlapError } = await supabase
      .from('bookings')
      .select('id, child_id')
      .eq('educator_profile_id', dto.educator_profile_id)
      .in('status', ['pending_payment', 'confirmed', 'in_progress'])
      .lt('booking_date_start', dto.booking_date_end)
      .gt('booking_date_end', dto.booking_date_start);

    if (overlapError) {
      this.logger.error(
        `Overlap query failed for educator ${dto.educator_profile_id}: ${overlapError.message}`,
      );
      throw new BadRequestException(
        'Erreur lors de la vérification de la disponibilité.',
      );
    }

    // Each existing booking contributes 1 child (current schema has a
    // single optional `child_id` per booking). Rows with a null child_id
    // still occupy a slot, so they count.
    const existingChildCount = (overlapping || []).length;
    const newChildCount = dto.child_id ? 1 : 0;
    const totalChildren = existingChildCount + newChildCount;

    if (totalChildren > maxChildren) {
      throw new BadRequestException(
        `Cet éducateur a atteint sa limite de ${maxChildren} enfants simultanés. Loi du Québec sur la garde d'enfants.`,
      );
    }
    // ─── end child-cap enforcement ───────────────────────────

    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        parent_profile_id: parentProfile.id,
        educator_profile_id: dto.educator_profile_id,
        service_id: dto.service_id,
        child_id: dto.child_id,
        booking_date_start: dto.booking_date_start,
        booking_date_end: dto.booking_date_end,
        duration_hours: dto.duration_hours,
        location_postal_code: dto.location_postal_code,
        location_latitude: locationData?.latitude,
        location_longitude: locationData?.longitude,
        location_point: locationData
          ? `POINT(${locationData.longitude} ${locationData.latitude})`
          : null,
        distance_km: Math.round(distanceKm * 100) / 100,
        mileage_fee_cents: pricing.mileageFeeCents,
        base_rate_cents: educatorService.hourly_rate_cents,
        hourly_rate_cents: educatorService.hourly_rate_cents,
        subtotal_cents: pricing.subtotalCents,
        platform_commission_cents: pricing.platformCommissionCents,
        educator_earnings_cents: pricing.educatorEarningsCents,
        total_amount_cents: pricing.totalAmountCents,
        status: 'pending_payment',
        notes: dto.notes,
        special_requests: dto.special_requests,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la création de la réservation',
      );
    }

    return booking;
  }

  async findAll(
    profileId: string,
    role: string,
    page = 1,
    limit = 20,
    status?: string,
  ) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    let profileField: string;
    if (role === 'parent') {
      const { data: pp } = await supabase
        .from('parent_profiles')
        .select('id')
        .eq('profile_id', profileId)
        .single();
      if (!pp) throw new NotFoundException('Profil non trouvé');
      profileField = 'parent_profile_id';

      // FK hint on the inner `profiles` join is required: educator_profiles
      // has two FKs to profiles (profile_id + license_reviewed_by), and
      // PostgREST refuses to guess. Without it the whole select 400s and
      // the parent's bookings list shows "Error loading bookings".
      let query = supabase
        .from('bookings')
        .select(
          '*, educator_profiles(*, profiles!educator_profiles_profile_id_fkey(first_name, last_name, avatar_url)), services(*)',
          { count: 'exact' },
        )
        .eq(profileField, pp.id)
        .order('booking_date_start', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      const { data, error, count } = await query;
      if (error) {
        this.logger.error(
          `Parent bookings query failed (profile ${profileId}): ${error.message}`,
        );
        throw new BadRequestException(
          'Erreur lors de la récupération des réservations',
        );
      }
      return {
        data,
        meta: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } else {
      const { data: ep } = await supabase
        .from('educator_profiles')
        .select('id')
        .eq('profile_id', profileId)
        .single();
      if (!ep) throw new NotFoundException('Profil non trouvé');
      profileField = 'educator_profile_id';

      let query = supabase
        .from('bookings')
        .select(
          '*, parent_profiles(*, profiles(first_name, last_name, avatar_url)), services(*)',
          { count: 'exact' },
        )
        .eq(profileField, ep.id)
        .order('booking_date_start', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      const { data, error, count } = await query;
      if (error) {
        this.logger.error(
          `Educator bookings query failed (profile ${profileId}): ${error.message}`,
        );
        throw new BadRequestException(
          'Erreur lors de la récupération des réservations',
        );
      }
      return {
        data,
        meta: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    }
  }

  async findOne(bookingId: string, profileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    // FK hint required on `educator_profiles → profiles`: educator_profiles
    // has two FKs to profiles (profile_id + license_reviewed_by) and
    // PostgREST otherwise refuses to resolve the relationship — the whole
    // single() then errors and the page surfaces "Réservation non trouvée"
    // (404) even when the booking exists.
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `*,
        parent_profiles(*, profiles(first_name, last_name, avatar_url, email, phone)),
        educator_profiles(*, profiles!educator_profiles_profile_id_fkey(first_name, last_name, avatar_url, email, phone)),
        services(*),
        payments(*),
        reviews(*)`,
      )
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      if (error) {
        this.logger.error(
          `Booking detail query failed (booking ${bookingId}): ${error.message}`,
        );
      }
      throw new NotFoundException('Réservation non trouvée');
    }

    return data;
  }

  async cancel(bookingId: string, profileId: string, dto: CancelBookingDto) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      throw new NotFoundException('Réservation non trouvée');
    }

    if (['completed', 'cancelled', 'refunded'].includes(booking.status)) {
      throw new BadRequestException(
        'Cette réservation ne peut pas être annulée',
      );
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_by_profile_id: profileId,
        cancellation_reason: dto.cancellation_reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        "Erreur lors de l'annulation de la réservation",
      );
    }

    // If booking was confirmed (paid), trigger refund
    if (booking.status === 'confirmed') {
      try {
        const hoursUntilBooking =
          (new Date(booking.booking_date_start).getTime() - Date.now()) /
          (1000 * 60 * 60);

        if (hoursUntilBooking > 24) {
          // Full refund if > 24h before booking
          await this.paymentsService.processRefund(bookingId);
        } else {
          // Partial refund: charge 25% cancellation fee
          const cancellationFee = Math.round(booking.subtotal_cents * 0.25);
          const refundAmount = booking.total_amount_cents - cancellationFee;
          if (refundAmount > 0) {
            await this.paymentsService.processRefund(bookingId, refundAmount);
          }
        }
      } catch (err) {
        // Refund failure shouldn't block cancellation — log and continue
        console.error('Refund failed during cancellation:', err);
      }
    }

    // Send notifications
    await this.notificationsService.create({
      profile_id: booking.parent_profile_id,
      notification_type: 'booking_cancelled',
      title: 'Réservation annulée',
      message: `Votre réservation a été annulée.`,
      related_booking_id: bookingId,
    });

    return data;
  }

  async complete(bookingId: string, profileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      throw new NotFoundException('Réservation non trouvée');
    }

    if (booking.status !== 'in_progress' && booking.status !== 'confirmed') {
      throw new BadRequestException(
        'Seules les réservations en cours peuvent être complétées',
      );
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la complétion de la réservation',
      );
    }

    // Create pending payout record (with 7-day hold)
    await this.payoutsService.createPayoutRecord(bookingId);

    // Notify for review
    await this.notificationsService.create({
      profile_id: booking.parent_profile_id,
      notification_type: 'review_request',
      title: 'Laissez un avis',
      message: "Le service est terminé. N'hésitez pas à laisser un avis!",
      related_booking_id: bookingId,
    });

    return data;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
