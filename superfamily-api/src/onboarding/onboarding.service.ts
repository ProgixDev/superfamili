import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

/** DB row shape — mirrors the `user_onboarding` table exactly. */
export interface OnboardingRow {
  user_id: string;
  completed_steps: string[];
  tutorial_skipped: boolean;
  tutorial_completed_at: string | null;
  updated_at: string;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Returns the user's onboarding row. If no row exists yet, lazily
   * creates one with defaults (`completed_steps=[]`, `tutorial_skipped=false`)
   * so the caller always gets a valid shape back. Idempotent — safe to
   * call on every dashboard load.
   */
  async getMine(profileId: string): Promise<OnboardingRow> {
    if (!profileId) {
      throw new ForbiddenException('Profil utilisateur introuvable.');
    }

    const supabase = this.supabaseService.getServiceClient();

    const { data: existing, error: readError } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', profileId)
      .maybeSingle();

    if (readError) {
      this.logger.error(
        `user_onboarding read failed for ${profileId}: ${readError.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de la récupération de l'état d'onboarding.",
      );
    }

    if (existing) return existing as OnboardingRow;

    // Lazy create on first access.
    const { data: created, error: insertError } = await supabase
      .from('user_onboarding')
      .insert({ user_id: profileId })
      .select('*')
      .single();

    if (insertError || !created) {
      // Race condition: another request just created the row. Re-read
      // and return that one instead of failing.
      const { data: retry } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', profileId)
        .maybeSingle();
      if (retry) return retry as OnboardingRow;

      this.logger.error(
        `user_onboarding lazy insert failed for ${profileId}: ${insertError?.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de l'initialisation de l'état d'onboarding.",
      );
    }

    return created as OnboardingRow;
  }

  /**
   * Updates the user's onboarding row. Accepts any combination of
   * `completed_steps` / `skipped` / `completed`. `completed=true`
   * sets `tutorial_completed_at = now()`; `completed=false` clears it.
   */
  async updateMine(
    profileId: string,
    dto: UpdateOnboardingDto,
  ): Promise<OnboardingRow> {
    if (!profileId) {
      throw new ForbiddenException('Profil utilisateur introuvable.');
    }

    // Ensure a row exists first, then update.
    await this.getMine(profileId);

    const supabase = this.supabaseService.getServiceClient();

    const updates: Record<string, unknown> = {};
    if (dto.completed_steps !== undefined) {
      updates.completed_steps = dto.completed_steps;
    }
    if (dto.skipped !== undefined) {
      updates.tutorial_skipped = dto.skipped;
    }
    if (dto.completed !== undefined) {
      updates.tutorial_completed_at = dto.completed
        ? new Date().toISOString()
        : null;
    }

    // If nothing was provided, return the current state — no-op update.
    if (Object.keys(updates).length === 0) {
      return this.getMine(profileId);
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .update(updates)
      .eq('user_id', profileId)
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error(
        `user_onboarding update failed for ${profileId}: ${error?.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de la mise à jour de l'état d'onboarding.",
      );
    }

    return data as OnboardingRow;
  }
}
