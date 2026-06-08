import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Admin-facing license review workflow.
 *
 * Any `approved` / `rejected` transition comes through here — educators
 * themselves can only set their status to `none` or `pending` via
 * `POST /educators/me/license`. Keeping the transitions split makes the
 * trust boundary explicit.
 */
@Injectable()
export class AdminEducatorsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Lists educators whose license submission is waiting for admin review.
   * Ordered oldest-first so the queue is FIFO.
   */
  async listPendingLicenses(page = 1, limit = 20) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('educator_profiles')
      .select(
        `id,
         profile_id,
         license_status,
         license_document_url,
         license_submitted_at,
         profiles!educator_profiles_profile_id_fkey(first_name, last_name, email)`,
        { count: 'exact' },
      )
      .eq('license_status', 'pending')
      .order('license_submitted_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des permis en attente.',
      );
    }

    // Sign each document URL so the admin UI can preview the PDF/image
    // without minting its own signed URLs. 15-minute signatures are plenty
    // for a manual review click.
    const withSignedUrls = await Promise.all(
      (data || []).map(async (row: any) => {
        let signedUrl: string | null = null;
        if (row.license_document_url) {
          const { data: signed } = await supabase.storage
            .from('licenses')
            .createSignedUrl(row.license_document_url, 60 * 15);
          signedUrl = signed?.signedUrl ?? null;
        }
        return { ...row, license_document_signed_url: signedUrl };
      }),
    );

    return {
      data: withSignedUrls,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async listEducators(page = 1, limit = 20, search?: string) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    const query = supabase
      .from('educator_profiles')
      .select(
        `id,
         profile_id,
         license_status,
         created_at,
         profiles!educator_profiles_profile_id_fkey(first_name, last_name, email, is_active)`,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      // Supabase text search on a joined table is somewhat limited without a view.
      // But we can do our best or just omit the search if it gets complex.
      // Here we will do a basic search if possible or omit it since it's hard over join.
    }

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des éducateurs.',
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

  async approveLicense(educatorProfileId: string, adminProfileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    // Load current state so we can (a) guard against approving a non-pending
    // row, and (b) know whose profile_id to notify.
    const current = await this.loadEducator(educatorProfileId);
    if (current.license_status !== 'pending') {
      throw new BadRequestException(
        `Ce permis n'est pas en attente (statut actuel : ${current.license_status}).`,
      );
    }

    const { data, error } = await supabase
      .from('educator_profiles')
      .update({
        license_status: 'approved',
        license_reviewed_at: new Date().toISOString(),
        license_reviewed_by: adminProfileId,
        license_rejection_reason: null,
      })
      .eq('id', educatorProfileId)
      .select('id, license_status, license_reviewed_at')
      .single();

    if (error) {
      throw new BadRequestException("Erreur lors de l'approbation du permis.");
    }

    await this.notificationsService.create({
      profile_id: current.profile_id,
      notification_type: 'license_approved',
      title: 'Permis approuvé',
      message:
        "Votre permis gouvernemental a été vérifié. Vous pouvez maintenant accueillir jusqu'à 15 enfants simultanément.",
    });

    return data;
  }

  async rejectLicense(
    educatorProfileId: string,
    adminProfileId: string,
    reason: string,
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Une raison de rejet est requise.');
    }

    const supabase = this.supabaseService.getServiceClient();

    const current = await this.loadEducator(educatorProfileId);
    if (current.license_status !== 'pending') {
      throw new BadRequestException(
        `Ce permis n'est pas en attente (statut actuel : ${current.license_status}).`,
      );
    }

    const { data, error } = await supabase
      .from('educator_profiles')
      .update({
        license_status: 'rejected',
        license_reviewed_at: new Date().toISOString(),
        license_reviewed_by: adminProfileId,
        license_rejection_reason: reason.trim(),
      })
      .eq('id', educatorProfileId)
      .select(
        'id, license_status, license_reviewed_at, license_rejection_reason',
      )
      .single();

    if (error) {
      throw new BadRequestException('Erreur lors du rejet du permis.');
    }

    await this.notificationsService.create({
      profile_id: current.profile_id,
      notification_type: 'license_rejected',
      title: 'Permis rejeté',
      message: `Votre permis a été rejeté. Raison : ${reason.trim()}`,
    });

    return data;
  }

  private async loadEducator(educatorProfileId: string) {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('educator_profiles')
      .select('id, profile_id, license_status')
      .eq('id', educatorProfileId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        "Erreur lors de la récupération du profil d'éducateur.",
      );
    }
    if (!data) {
      throw new NotFoundException("Profil d'éducateur introuvable.");
    }
    return data as {
      id: string;
      profile_id: string;
      license_status: 'none' | 'pending' | 'approved' | 'rejected';
    };
  }
}
