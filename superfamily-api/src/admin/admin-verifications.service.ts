import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminVerificationsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listPending(page = 1, limit = 20) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('educator_verifications')
      // FK hint mandatory on the inner profiles join — educator_profiles has
      // two FKs to profiles (profile_id + license_reviewed_by). Without it,
      // PostgREST 400s and the admin verifications list errors out.
      .select(
        '*, educator_profiles(profiles!educator_profiles_profile_id_fkey(first_name, last_name, email))',
        { count: 'exact' },
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des vérifications',
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

  async approve(verificationId: string, adminProfileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_verifications')
      .update({
        status: 'verified',
        verified_by: adminProfileId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verificationId)
      .select('*, educator_profiles(profile_id)')
      .single();

    if (error) {
      throw new BadRequestException(
        "Erreur lors de l'approbation de la vérification",
      );
    }

    // Check if all verifications are done, mark profile verified
    const educatorProfileId = data?.educator_profiles?.profile_id;
    if (educatorProfileId) {
      const { data: pending } = await supabase
        .from('educator_verifications')
        .select('id')
        .eq('educator_profile_id', data.educator_profile_id)
        .eq('status', 'pending');

      if (!pending || pending.length === 0) {
        await supabase
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', educatorProfileId);

        await supabase
          .from('educator_profiles')
          .update({ is_background_checked: true })
          .eq('profile_id', educatorProfileId);
      }

      await this.notificationsService.create({
        profile_id: educatorProfileId,
        notification_type: 'profile_verification_status',
        title: 'Vérification approuvée',
        message: 'Votre document a été vérifié avec succès.',
      });
    }

    return data;
  }

  async reject(verificationId: string, adminProfileId: string, reason: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_verifications')
      .update({
        status: 'rejected',
        verified_by: adminProfileId,
        verified_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', verificationId)
      .select('*, educator_profiles(profile_id)')
      .single();

    if (error) {
      throw new BadRequestException('Erreur lors du rejet de la vérification');
    }

    const educatorProfileId = data?.educator_profiles?.profile_id;
    if (educatorProfileId) {
      await this.notificationsService.create({
        profile_id: educatorProfileId,
        notification_type: 'profile_verification_status',
        title: 'Vérification rejetée',
        message: `Votre document a été rejeté. Raison: ${reason}`,
      });
    }

    return data;
  }
}
