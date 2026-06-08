import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentsService } from '../consents/consents.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';

/** References are optional; educators may add up to 5 to strengthen their file. */
export const MIN_REFERENCES_FOR_ACTIVATION = 0;

/** Schema-level cap — backup to the SQL trigger, surfaced as a nice error. */
export const MAX_REFERENCES_PER_EDUCATOR = 5;

/**
 * Basic spam filter — rejects testimonials containing URLs or email
 * addresses. Kept intentionally simple; a dedicated text-classification
 * service would be overkill for what is essentially "don't let the form
 * become a linkbait channel".
 */
const URL_REGEX = /(https?:\/\/|www\.|\.com|\.ca|\.fr|\.org|\.net)/i;
const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w-]+/;

export interface ReferenceRow {
  id: string;
  educator_id: string;
  full_name: string;
  relationship: string | null;
  phone: string;
  email: string | null;
  address: string;
  testimonial: string;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ReferencesService {
  private readonly logger = new Logger(ReferencesService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly consentsService: ConsentsService,
  ) {}

  // ─── Educator: list own ────────────────────────────────────────────

  async listForEducator(profileId: string): Promise<ReferenceRow[]> {
    const educatorId = await this.resolveEducatorId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_references')
      .select('*')
      .eq('educator_id', educatorId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(
        `list references failed for educator ${educatorId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération des références.',
      );
    }
    return (data ?? []) as ReferenceRow[];
  }

  // ─── Educator: create ──────────────────────────────────────────────

  async create(
    profileId: string,
    dto: CreateReferenceDto,
  ): Promise<ReferenceRow> {
    // Consent gate — the educator must have accepted the reference
    // contact authorization before we create a row (which the admin
    // would later call to verify). Defense in depth; the frontend
    // shows the consent modal before the form.
    await this.consentsService.requireConsent(profileId, 'reference_contact');

    this.validateSpam(dto.testimonial);

    const educatorId = await this.resolveEducatorId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    // Pre-check the max-5 cap so we can return a nice error before the
    // DB trigger fires. The trigger is still the authoritative guardrail.
    const { count } = await supabase
      .from('educator_references')
      .select('id', { count: 'exact', head: true })
      .eq('educator_id', educatorId);

    if ((count ?? 0) >= MAX_REFERENCES_PER_EDUCATOR) {
      throw new BadRequestException(
        `Vous avez atteint le maximum de ${MAX_REFERENCES_PER_EDUCATOR} références.`,
      );
    }

    const normalizedPhone = this.normalizePhoneE164(dto.phone);

    const { data, error } = await supabase
      .from('educator_references')
      .insert({
        educator_id: educatorId,
        full_name: dto.full_name.trim(),
        relationship: dto.relationship?.trim() ?? null,
        phone: normalizedPhone,
        email: dto.email?.trim() ?? null,
        address: dto.address.trim(),
        testimonial: dto.testimonial.trim(),
      })
      .select('*')
      .single();

    if (error || !data) {
      // If the trigger fired, surface its message as-is.
      if (error?.message?.includes('Maximum 5')) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(
        `reference insert failed for educator ${educatorId}: ${error?.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la création de la référence.',
      );
    }

    return data as ReferenceRow;
  }

  // ─── Educator: update (only if unverified) ─────────────────────────

  async update(
    profileId: string,
    referenceId: string,
    dto: UpdateReferenceDto,
  ): Promise<ReferenceRow> {
    const educatorId = await this.resolveEducatorId(profileId);
    const current = await this.loadOwn(educatorId, referenceId);

    if (current.verified) {
      throw new BadRequestException(
        'Cette référence a déjà été vérifiée et ne peut plus être modifiée.',
      );
    }

    if (dto.testimonial !== undefined) {
      this.validateSpam(dto.testimonial);
    }

    const supabase = this.supabaseService.getServiceClient();

    const updates: Record<string, unknown> = {};
    if (dto.full_name !== undefined) updates.full_name = dto.full_name.trim();
    if (dto.relationship !== undefined)
      updates.relationship = dto.relationship?.trim() ?? null;
    if (dto.phone !== undefined)
      updates.phone = this.normalizePhoneE164(dto.phone);
    if (dto.email !== undefined) updates.email = dto.email?.trim() ?? null;
    if (dto.address !== undefined) updates.address = dto.address.trim();
    if (dto.testimonial !== undefined)
      updates.testimonial = dto.testimonial.trim();

    const { data, error } = await supabase
      .from('educator_references')
      .update(updates)
      .eq('id', referenceId)
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error(
        `reference update failed for ${referenceId}: ${error?.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la mise à jour de la référence.',
      );
    }
    return data as ReferenceRow;
  }

  // ─── Educator: delete (only if unverified) ─────────────────────────

  async delete(profileId: string, referenceId: string): Promise<void> {
    const educatorId = await this.resolveEducatorId(profileId);
    const current = await this.loadOwn(educatorId, referenceId);

    if (current.verified) {
      throw new BadRequestException(
        'Cette référence a déjà été vérifiée et ne peut plus être supprimée.',
      );
    }

    const supabase = this.supabaseService.getServiceClient();
    const { error } = await supabase
      .from('educator_references')
      .delete()
      .eq('id', referenceId);

    if (error) {
      this.logger.error(
        `reference delete failed for ${referenceId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la suppression de la référence.',
      );
    }
  }

  // ─── Admin: list for an educator ───────────────────────────────────

  async listForAdmin(educatorId: string): Promise<ReferenceRow[]> {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_references')
      .select('*')
      .eq('educator_id', educatorId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(
        `admin list references failed for educator ${educatorId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération des références.',
      );
    }
    return (data ?? []) as ReferenceRow[];
  }

  // ─── Admin: verify ─────────────────────────────────────────────────

  async verify(
    educatorId: string,
    referenceId: string,
    adminProfileId: string,
    notes: string | undefined,
  ): Promise<ReferenceRow> {
    const supabase = this.supabaseService.getServiceClient();

    // Load and ensure the reference actually belongs to this educator —
    // prevents a malformed URL from letting an admin verify someone
    // else's reference by pasting a mismatching id.
    const { data: current, error: fetchError } = await supabase
      .from('educator_references')
      .select('id, educator_id, verified')
      .eq('id', referenceId)
      .maybeSingle();

    if (fetchError) {
      throw new InternalServerErrorException(
        'Erreur lors de la récupération de la référence.',
      );
    }
    if (!current) {
      throw new NotFoundException('Référence introuvable.');
    }
    if (current.educator_id !== educatorId) {
      throw new BadRequestException(
        "Cette référence n'appartient pas à cet éducateur.",
      );
    }
    if (current.verified) {
      throw new BadRequestException('Cette référence est déjà vérifiée.');
    }

    const { data, error } = await supabase
      .from('educator_references')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        verified_by: adminProfileId,
        verification_notes: notes?.trim() ?? null,
      })
      .eq('id', referenceId)
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error(
        `reference verify failed for ${referenceId}: ${error?.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la vérification de la référence.',
      );
    }
    return data as ReferenceRow;
  }

  // ─── Public helper: references are no longer an activation blocker ─────

  async canActivate(profileId: string): Promise<boolean> {
    await this.resolveEducatorId(profileId);
    return true;
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  /**
   * Normalizes any of the accepted Canadian phone formats to E.164:
   *   (514) 555-1234        → +15145551234
   *   +1 514 555 1234       → +15145551234
   *   514-555-1234          → +15145551234
   *
   * Keeps the input string valid even if the regex in the DTO drifts —
   * we strip everything non-digit, then require 10 or 11 digits. If 11,
   * the leading digit must be 1.
   */
  private normalizePhoneE164(raw: string): string {
    const digits = raw.replace(/\D+/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    throw new BadRequestException(
      'Format de téléphone invalide. Utilisez un numéro canadien (10 chiffres).',
    );
  }

  /**
   * Rejects testimonials containing URLs or email addresses. Runs AFTER
   * class-validator so the 50–1000 length check happens first.
   */
  private validateSpam(testimonial: string): void {
    if (URL_REGEX.test(testimonial)) {
      throw new BadRequestException(
        "Le témoignage ne peut pas contenir d'URL.",
      );
    }
    if (EMAIL_REGEX.test(testimonial)) {
      throw new BadRequestException(
        "Le témoignage ne peut pas contenir d'adresse courriel.",
      );
    }
  }

  /** Loads a reference and ensures it belongs to the caller's educator. */
  private async loadOwn(
    educatorId: string,
    referenceId: string,
  ): Promise<ReferenceRow> {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('educator_references')
      .select('*')
      .eq('id', referenceId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'Erreur lors de la récupération de la référence.',
      );
    }
    if (!data) {
      throw new NotFoundException('Référence introuvable.');
    }
    if ((data as ReferenceRow).educator_id !== educatorId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à accéder à cette référence.",
      );
    }
    return data as ReferenceRow;
  }

  /** Resolves profiles.id → educator_profiles.id. */
  private async resolveEducatorId(profileId: string): Promise<string> {
    if (!profileId) {
      throw new ForbiddenException('Profil utilisateur introuvable.');
    }
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('educator_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'Erreur lors de la vérification du profil.',
      );
    }
    if (!data) {
      throw new ForbiddenException(
        'Aucun profil éducateur associé à ce compte.',
      );
    }
    return data.id as string;
  }
}
