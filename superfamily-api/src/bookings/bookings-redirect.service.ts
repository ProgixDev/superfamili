import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsRedirectService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findReplacementEducators(bookingId: string) {
    const supabase = this.supabaseService.getServiceClient();

    // Get the cancelled booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!booking) return [];

    // Find nearby available educators for the same service and time
    const { data: educators } = await supabase
      .from('educator_services')
      .select(
        `*,
        educator_profiles!inner(
          id, average_rating, completion_rate,
          profiles!educator_profiles_profile_id_fkey(
            first_name, last_name, avatar_url, postal_code,
            is_active, is_verified, latitude, longitude
          )
        )`,
      )
      .eq('service_id', booking.service_id)
      .eq('is_active', true)
      .eq('educator_profiles.profiles.is_active', true)
      .eq('educator_profiles.profiles.is_verified', true)
      .neq('educator_profile_id', booking.educator_profile_id)
      .order('educator_profiles.average_rating', { ascending: false })
      .limit(10);

    if (!educators || educators.length === 0) {
      // No replacement found — notify parent
      await this.notificationsService.create({
        profile_id: booking.parent_profile_id,
        notification_type: 'booking_cancelled',
        title: 'Aucun éducateur de remplacement disponible',
        message:
          "Nous n'avons pas trouvé d'éducateur de remplacement. Un remboursement sera effectué.",
        related_booking_id: bookingId,
      });
      return [];
    }

    // Notify parent with replacement options
    await this.notificationsService.create({
      profile_id: booking.parent_profile_id,
      notification_type: 'educator_nearby',
      title: 'Éducateurs de remplacement disponibles',
      message: `${educators.length} éducateur(s) disponible(s) pour remplacer votre réservation annulée.`,
      related_booking_id: bookingId,
      data: {
        replacement_educators: educators.map(
          (e: any) => e.educator_profiles.id,
        ),
      },
    });

    return educators;
  }
}
