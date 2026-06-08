import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateEducatorProfileDto } from './dto/update-educator-profile.dto';
import { CreateEducatorServiceDto } from './dto/create-educator-service.dto';
import {
  SetAvailabilityDto,
  CreateAvailabilityOverrideDto,
} from './dto/set-availability.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';

/**
 * Quebec childcare child-cap limits. These constants are the single source of
 * truth — never hardcode 5 or 15 anywhere else.
 */
export const LICENSED_CHILD_CAP = 15;
export const UNLICENSED_CHILD_CAP = 5;

export type LicenseStatus = 'none' | 'pending' | 'approved' | 'rejected';

const LICENSE_BUCKET = 'licenses';
const LICENSE_MAX_FILE_SIZE = 10 * 1024 * 1024;
const LICENSE_ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

function pickLicenseExtension(file: Express.Multer.File): string {
  switch (file.mimetype) {
    case 'application/pdf':
      return '.pdf';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}

@Injectable()
export class EducatorsService {
  private readonly logger = new Logger(EducatorsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private async getEducatorProfileId(profileId: string): Promise<string> {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('educator_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (error || !data) {
      throw new ForbiddenException("Profil d'éducateur non trouvé");
    }
    return data.id;
  }

  async geocode(query: string) {
    const supabase = this.supabaseService.getServiceClient();

    // Check if it looks like a Canadian postal code (e.g. H1E 7C1 or H1E7C1)
    const postalMatch = query
      .toUpperCase()
      .replace(/\s/g, '')
      .match(/^([A-Z]\d[A-Z])(\d[A-Z]\d)?$/);

    if (postalMatch) {
      const fsa = postalMatch[1]; // First 3 chars (Forward Sortation Area)
      // Try exact match first
      const { data: exact } = await supabase
        .from('postal_codes')
        .select('postal_code, city, province, latitude, longitude')
        .ilike(
          'postal_code',
          `${query.toUpperCase().replace(/\s/g, '').slice(0, 3)}%`,
        )
        .limit(1)
        .single();

      if (exact) {
        return {
          latitude: exact.latitude,
          longitude: exact.longitude,
          address: `${exact.postal_code}, ${exact.city}, ${exact.province}`,
          city: exact.city,
        };
      }

      // Try cities table by matching known FSA prefixes
      // Many Montreal postal codes start with H
      const cityGuess = fsa.startsWith('H')
        ? 'Montréal'
        : fsa.startsWith('G')
          ? 'Québec'
          : fsa.startsWith('J')
            ? 'Longueuil'
            : fsa.startsWith('K')
              ? 'Ottawa'
              : fsa.startsWith('M')
                ? 'Toronto'
                : fsa.startsWith('V')
                  ? 'Vancouver'
                  : fsa.startsWith('T')
                    ? 'Calgary'
                    : fsa.startsWith('R')
                      ? 'Winnipeg'
                      : fsa.startsWith('S')
                        ? 'Saskatoon'
                        : fsa.startsWith('E')
                          ? 'Moncton'
                          : fsa.startsWith('B')
                            ? 'Halifax'
                            : fsa.startsWith('A')
                              ? "St. John's"
                              : null;

      if (cityGuess) {
        const { data: city } = await supabase
          .from('cities')
          .select('name, province, latitude, longitude')
          .eq('name', cityGuess)
          .limit(1)
          .single();

        if (city) {
          return {
            latitude: city.latitude,
            longitude: city.longitude,
            address: `${query.toUpperCase()}, ${city.name}, ${city.province}`,
            city: city.name,
          };
        }
      }
    }

    // Try city name match
    const { data: cityMatch } = await supabase
      .from('cities')
      .select('name, province, latitude, longitude')
      .ilike('name', `%${query}%`)
      .limit(1)
      .single();

    if (cityMatch) {
      return {
        latitude: cityMatch.latitude,
        longitude: cityMatch.longitude,
        address: `${cityMatch.name}, ${cityMatch.province}`,
        city: cityMatch.name,
      };
    }

    return null;
  }

  async getCities() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, province, latitude, longitude')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new BadRequestException('Erreur lors du chargement des villes');
    }
    return data || [];
  }

  async getServicesCatalog() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, category')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new BadRequestException('Erreur lors du chargement des services');
    }
    return data || [];
  }

  async getMyProfile(profileId: string) {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('educator_profiles')
      .select(
        `*,
        educator_services(*, services(*)),
        educator_availability(*),
        educator_verifications(*)`,
      )
      .eq('profile_id', profileId)
      .single();

    if (error || !data) {
      throw new NotFoundException("Profil d'éducateur non trouvé");
    }
    return data;
  }

  /**
   * Returns the maximum number of simultaneous children this educator is
   * legally allowed to supervise, based on their Quebec government license
   * status. Only an `approved` license unlocks the higher tier — `pending`,
   * `rejected`, and `none` all map to {@link UNLICENSED_CHILD_CAP}.
   *
   * This method is deliberately tolerant of missing rows: if the educator
   * profile can't be found, it returns the conservative (lower) cap instead
   * of throwing, so a data inconsistency can never accidentally unlock the
   * higher tier.
   */
  async getMaxChildrenForEducator(educatorProfileId: string): Promise<number> {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_profiles')
      .select('license_status')
      .eq('id', educatorProfileId)
      .maybeSingle();

    if (error) {
      // Log and fall back to the conservative cap — never silently unlock 15.
      this.logger.error(
        `License lookup failed for educator ${educatorProfileId}: ${error.message}`,
      );
      return UNLICENSED_CHILD_CAP;
    }

    if (!data) {
      return UNLICENSED_CHILD_CAP;
    }

    return (data.license_status as LicenseStatus) === 'approved'
      ? LICENSED_CHILD_CAP
      : UNLICENSED_CHILD_CAP;
  }

  /**
   * Educator-facing license submission. Accepts the file as multipart and
   * uploads it to the `licenses` bucket using the service role (bypassing
   * client-side RLS). Sets status to `pending` (admin review) or `none`
   * (educator said no license). Cannot set status to `approved` or
   * `rejected` — those are admin-only transitions.
   */
  async submitLicense(
    profileId: string,
    dto: UpdateLicenseDto,
    file: Express.Multer.File | undefined,
  ) {
    const educatorProfileId = await this.getEducatorProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    if (dto.hasLicense) {
      if (!file) {
        throw new BadRequestException(
          'Un document de permis est requis lorsque vous déclarez en avoir un.',
        );
      }
      if (file.size > LICENSE_MAX_FILE_SIZE) {
        throw new BadRequestException(
          'Fichier trop volumineux. Taille maximale : 10 Mo.',
        );
      }
      if (
        !(LICENSE_ALLOWED_MIMES as readonly string[]).includes(file.mimetype)
      ) {
        throw new BadRequestException(
          'Type de fichier non autorisé. Utilisez PDF, JPG, PNG ou WebP.',
        );
      }

      const ext = pickLicenseExtension(file);
      const storageKey = `${educatorProfileId}/license-${Date.now()}${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(LICENSE_BUCKET)
        .upload(storageKey, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        this.logger.error(
          `License storage upload failed for educator ${educatorProfileId}: ${uploadError.message}`,
        );
        throw new InternalServerErrorException(
          'Erreur lors du téléversement du permis.',
        );
      }

      const { data, error } = await supabase
        .from('educator_profiles')
        .update({
          license_status: 'pending',
          license_document_url: storageKey,
          license_submitted_at: new Date().toISOString(),
          license_reviewed_at: null,
          license_reviewed_by: null,
          license_rejection_reason: null,
        })
        .eq('id', educatorProfileId)
        .select('id, license_status, license_submitted_at')
        .single();

      if (error) {
        await supabase.storage
          .from(LICENSE_BUCKET)
          .remove([storageKey])
          .then(() => undefined)
          .catch((err) =>
            this.logger.warn(
              `Orphaned license cleanup failed (${storageKey}): ${err}`,
            ),
          );
        throw new InternalServerErrorException(
          'Erreur lors de la soumission du permis.',
        );
      }
      return data;
    }

    // hasLicense === false → educator declared they don't have one.
    const { data, error } = await supabase
      .from('educator_profiles')
      .update({
        license_status: 'none',
        license_document_url: null,
        license_submitted_at: null,
        license_reviewed_at: null,
        license_reviewed_by: null,
        license_rejection_reason: null,
      })
      .eq('id', educatorProfileId)
      .select('id, license_status')
      .single();

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la mise à jour du statut de permis.',
      );
    }
    return data;
  }

  async getPublicProfile(educatorProfileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: educatorProfile, error } = await supabase
      .from('educator_profiles')
      .select(
        `*,
        profiles!educator_profiles_profile_id_fkey(first_name, last_name, avatar_url, postal_code, gender, bio, is_active, is_verified),
        educator_services(*, services(*)),
        educator_availability(*)`,
      )
      .eq('id', educatorProfileId)
      .single();

    if (error || !educatorProfile) {
      throw new NotFoundException('Éducateur non trouvé');
    }

    return educatorProfile;
  }

  /**
   * Returns the time ranges in which the educator is already booked between
   * `from` (inclusive) and `to` (exclusive). Used by the parent-side booking
   * picker to grey out occupied slots before the parent commits.
   *
   * Only PII-free fields are returned (start/end timestamps + status). Active
   * statuses ('pending_payment', 'confirmed', 'in_progress') count as busy;
   * cancelled / completed / refunded bookings free the slot.
   */
  async getBusyRanges(
    educatorProfileId: string,
    from: string,
    to: string,
  ): Promise<Array<{ start: string; end: string }>> {
    const supabase = this.supabaseService.getServiceClient();

    // Defense in depth: caller validates the date strings, but reject obvious
    // junk here too so a malformed query can't bypass the date filters.
    if (!from || !to) {
      throw new BadRequestException('Plage de dates requise');
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('booking_date_start, booking_date_end')
      .eq('educator_profile_id', educatorProfileId)
      .in('status', ['pending_payment', 'confirmed', 'in_progress'])
      // Overlap with [from, to): booking starts before window end AND ends
      // after window start.
      .lt('booking_date_start', to)
      .gt('booking_date_end', from);

    if (error) {
      this.logger.error(
        `Busy-range query failed for educator ${educatorProfileId}: ${error.message}`,
      );
      throw new BadRequestException(
        'Erreur lors du chargement des créneaux occupés.',
      );
    }

    return (data || []).map((row) => ({
      start: row.booking_date_start,
      end: row.booking_date_end,
    }));
  }

  async updateMyProfile(profileId: string, dto: UpdateEducatorProfileDto) {
    const educatorProfileId = await this.getEducatorProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_profiles')
      .update(dto)
      .eq('id', educatorProfileId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        "Erreur lors de la mise à jour du profil d'éducateur",
      );
    }
    return data;
  }

  async addService(profileId: string, dto: CreateEducatorServiceDto) {
    const educatorProfileId = await this.getEducatorProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_services')
      .insert({ ...dto, educator_profile_id: educatorProfileId })
      .select('*, services(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Ce service est déjà offert');
      }
      throw new BadRequestException("Erreur lors de l'ajout du service");
    }
    return data;
  }

  async removeService(profileId: string, serviceId: string) {
    const educatorProfileId = await this.getEducatorProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { error } = await supabase
      .from('educator_services')
      .delete()
      .eq('id', serviceId)
      .eq('educator_profile_id', educatorProfileId);

    if (error) {
      throw new BadRequestException('Erreur lors de la suppression du service');
    }
    return { message: 'Service supprimé avec succès' };
  }

  async setAvailability(profileId: string, dto: SetAvailabilityDto) {
    const educatorProfileId = await this.getEducatorProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    // Delete existing availability and replace
    await supabase
      .from('educator_availability')
      .delete()
      .eq('educator_profile_id', educatorProfileId);

    const slots = dto.slots.map((slot) => ({
      ...slot,
      educator_profile_id: educatorProfileId,
    }));

    const { data, error } = await supabase
      .from('educator_availability')
      .insert(slots)
      .select();

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la mise à jour des disponibilités',
      );
    }
    return data;
  }

  async addAvailabilityOverride(
    profileId: string,
    dto: CreateAvailabilityOverrideDto,
  ) {
    const educatorProfileId = await this.getEducatorProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_availability_overrides')
      .insert({ ...dto, educator_profile_id: educatorProfileId })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        "Erreur lors de l'ajout de l'exception de disponibilité",
      );
    }
    return data;
  }

  async completeOnboardingStep(
    profileId: string,
    step: string,
    data?: Record<string, any>,
  ) {
    const educatorProfileId = await this.getEducatorProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    // Get current onboarding state
    const { data: profile } = await supabase
      .from('educator_profiles')
      .select('onboarding_step_completed_at')
      .eq('id', educatorProfileId)
      .single();

    const completedSteps = profile?.onboarding_step_completed_at || {};
    completedSteps[step] = new Date().toISOString();

    const steps = [
      'identity_verification',
      'profile',
      'credentials',
      'services_availability',
      'pricing_banking',
      'activation',
    ];
    const currentIndex = steps.indexOf(step);
    const nextStep =
      currentIndex < steps.length - 1 ? steps[currentIndex + 1] : step;

    const updateData: any = {
      onboarding_step_completed_at: completedSteps,
      current_onboarding_step: nextStep,
    };

    if (step === 'activation') {
      updateData.onboarding_completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from('educator_profiles')
      .update(updateData)
      .eq('id', educatorProfileId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        "Erreur lors de la mise à jour de l'étape d'intégration",
      );
    }
    return updated;
  }
}
