import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminDisputesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listDisputes(page = 1, limit = 20, status?: string) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('disputes')
      .select(
        '*, bookings(*, services(name)), profiles:opened_by_profile_id(first_name, last_name, email)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des litiges',
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

  async resolveDispute(
    disputeId: string,
    adminProfileId: string,
    resolutionNotes: string,
    resolutionType: string,
  ) {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes,
        resolution_type: resolutionType,
        decided_at: new Date().toISOString(),
        decided_by_profile_id: adminProfileId,
      })
      .eq('id', disputeId)
      .select('*, bookings(parent_profile_id, educator_profile_id)')
      .single();

    if (error) {
      throw new BadRequestException('Erreur lors de la résolution du litige');
    }

    // Notify the dispute opener
    if (data) {
      await this.notificationsService.create({
        profile_id: data.opened_by_profile_id,
        notification_type: 'dispute_opened',
        title: 'Litige résolu',
        message: `Votre litige a été résolu. Décision: ${resolutionType}`,
        related_booking_id: data.booking_id,
      });
    }

    return data;
  }
}
