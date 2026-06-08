import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  AcceptConsentDto,
  ConsentType,
  CONSENT_TYPES,
} from './dto/accept-consent.dto';

/**
 * Consents required for every account, regardless of role. If either of
 * these is missing, the user can't meaningfully use the platform.
 */
const ALWAYS_REQUIRED_CONSENTS: ConsentType[] = [
  'terms_of_use',
  'privacy_policy',
];

/**
 * Consents required only for educators. Parent accounts don't see these.
 * Note that these are GATED at the per-feature endpoint (KYC, documents,
 * references) rather than at signup — educators may sign up and only hit
 * them later when they reach those flows.
 */
const EDUCATOR_ONLY_CONSENTS: ConsentType[] = [
  'kyc_verification',
  'reference_contact',
  'background_check_storage',
];

/** Everyone can see this one, and it's optional (opt-in). */
const OPTIONAL_CONSENTS: ConsentType[] = ['marketing_emails'];

export interface RequiredConsent {
  consent_type: ConsentType;
  /** Current (latest) version of this policy. */
  version: string;
  /** True if refusing prevents the user from progressing. */
  required: boolean;
  /** True if the user already accepted the current version. */
  already_accepted: boolean;
}

export interface ConsentHistoryRow {
  id: string;
  consent_type: ConsentType;
  version: string;
  accepted: boolean;
  accepted_at: string;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface PolicyVersionRow {
  id: string;
  consent_type: ConsentType;
  version: string;
  effective_date: string;
  content_md: string;
}

@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ─── Required consents list ────────────────────────────────────────

  /**
   * Returns the full list of consents that apply to this user, each
   * annotated with whether they've already been accepted for the
   * current version. The frontend uses this to decide whether to show
   * the signup modal, the KYC modal, etc.
   *
   * Rules:
   *   * `terms_of_use` and `privacy_policy` are required for everyone.
   *   * `kyc_verification`, `reference_contact`, `background_check_storage`
   *     are required only for educators.
   *   * `marketing_emails` is always optional (opt-in).
   *
   * "Current version" = the `policy_versions` row with the latest
   * `effective_date` for each `consent_type`.
   *
   * "Already accepted" = a `user_consents` row exists for (user, type,
   * current_version) with `accepted=true` AND `revoked_at IS NULL`. If
   * the user accepted an older version, `already_accepted` is false —
   * they need to re-consent.
   */
  async getRequired(
    profileId: string,
    role: string,
  ): Promise<RequiredConsent[]> {
    if (!profileId) {
      throw new ForbiddenException('Profil utilisateur introuvable.');
    }

    const applicable = this.applicableConsentTypes(role);
    const currentVersions = await this.loadCurrentVersions();
    const userAccepted = await this.loadUserAcceptedMap(profileId);

    const out: RequiredConsent[] = [];
    for (const type of applicable) {
      const current = currentVersions.get(type);
      if (!current) {
        // No policy version exists yet for this type — skip. This
        // shouldn't happen after the 2026-04-11 seed, but we defend
        // against a half-applied migration rather than crashing.
        this.logger.warn(
          `No current policy_version for ${type} — skipping in required list`,
        );
        continue;
      }
      const acceptedVersion = userAccepted.get(type);
      const alreadyAccepted = acceptedVersion === current.version;

      out.push({
        consent_type: type,
        version: current.version,
        required: !OPTIONAL_CONSENTS.includes(type),
        already_accepted: alreadyAccepted,
      });
    }
    return out;
  }

  // ─── Fast "do you have this consent?" helper ──────────────────────

  /**
   * Returns `true` if the user has an effective (accepted, not revoked)
   * consent for the CURRENT version of `type`. Called by KYC, documents,
   * and references services to gate their own endpoints — defence in
   * depth on top of the frontend modals.
   */
  async hasValidConsent(
    profileId: string,
    type: ConsentType,
  ): Promise<boolean> {
    if (!profileId) return false;

    const current = await this.getCurrentVersion(type);
    if (!current) return false;

    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('user_consents')
      .select('id')
      .eq('user_id', profileId)
      .eq('consent_type', type)
      .eq('version', current.version)
      .eq('accepted', true)
      .is('revoked_at', null)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `hasValidConsent query failed for ${profileId}/${type}: ${error.message}`,
      );
      return false;
    }
    return !!data;
  }

  /**
   * Throws `ForbiddenException` with a clear message if the user hasn't
   * accepted the current version of `type`. Use this from other services
   * as a one-liner gate before performing a gated action.
   */
  async requireConsent(profileId: string, type: ConsentType): Promise<void> {
    const ok = await this.hasValidConsent(profileId, type);
    if (!ok) {
      throw new ForbiddenException(
        `Ce consentement est requis avant de continuer : ${this.typeLabel(type)}.`,
      );
    }
  }

  // ─── Accept a consent ─────────────────────────────────────────────

  async accept(
    profileId: string,
    dto: AcceptConsentDto,
    context: { ip: string | null; userAgent: string | null },
  ): Promise<void> {
    if (!profileId) {
      throw new ForbiddenException('Profil utilisateur introuvable.');
    }

    // Validate the version against the current published one. Users can
    // only accept the CURRENT version of each policy — they can't
    // pre-accept future versions or retroactively accept stale ones.
    const current = await this.getCurrentVersion(dto.consent_type);
    if (!current) {
      throw new NotFoundException(
        `Aucune version publiée pour ce consentement : ${dto.consent_type}.`,
      );
    }
    if (current.version !== dto.version) {
      throw new BadRequestException(
        `Version obsolète. Version actuelle : ${current.version}.`,
      );
    }

    // Required consents cannot be "declined" via this endpoint — the
    // frontend must either accept them or abort the flow entirely.
    const isOptional = OPTIONAL_CONSENTS.includes(dto.consent_type);
    if (!isOptional && !dto.accepted) {
      throw new BadRequestException(
        'Ce consentement est obligatoire. Vous ne pouvez pas le refuser via cet endpoint.',
      );
    }

    const supabase = this.supabaseService.getServiceClient();

    // Upsert on (user_id, consent_type, version). If the row already
    // exists (e.g., the user is re-accepting after a previous revoke),
    // this resets `revoked_at` and updates the IP/UA to the fresh
    // decision.
    const { error } = await supabase.from('user_consents').upsert(
      {
        user_id: profileId,
        consent_type: dto.consent_type,
        version: dto.version,
        accepted: dto.accepted,
        accepted_at: new Date().toISOString(),
        ip_address: context.ip,
        user_agent: context.userAgent,
        revoked_at: null,
        revoked_ip: null,
        revoked_user_agent: null,
      },
      { onConflict: 'user_id,consent_type,version' },
    );

    if (error) {
      this.logger.error(
        `consent accept failed for ${profileId}/${dto.consent_type}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de l'enregistrement du consentement.",
      );
    }
  }

  // ─── Revoke a consent ─────────────────────────────────────────────

  /**
   * Marks a consent as revoked. The caller is expected to also apply any
   * side effects (e.g., deactivating the account when terms are revoked,
   * clearing KYC status, etc.) — those decisions happen at the controller
   * level, not here, so each revocation type can follow a different
   * path.
   */
  async revoke(
    profileId: string,
    type: ConsentType,
    context: { ip: string | null; userAgent: string | null },
  ): Promise<void> {
    if (!profileId) {
      throw new ForbiddenException('Profil utilisateur introuvable.');
    }

    const supabase = this.supabaseService.getServiceClient();

    // Flip revoked_at on every row of this type for this user. In
    // practice there's typically only one effective row per (user,
    // type) at a time — but if multiple historical versions exist,
    // revoking them all is the safer semantic.
    const { error } = await supabase
      .from('user_consents')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_ip: context.ip,
        revoked_user_agent: context.userAgent,
      })
      .eq('user_id', profileId)
      .eq('consent_type', type)
      .is('revoked_at', null);

    if (error) {
      this.logger.error(
        `consent revoke failed for ${profileId}/${type}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la révocation du consentement.',
      );
    }
  }

  // ─── History (Loi 25 data export) ─────────────────────────────────

  async getHistory(profileId: string): Promise<ConsentHistoryRow[]> {
    if (!profileId) {
      throw new ForbiddenException('Profil utilisateur introuvable.');
    }

    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('user_consents')
      .select(
        'id, consent_type, version, accepted, accepted_at, revoked_at, ip_address, user_agent',
      )
      .eq('user_id', profileId)
      .order('accepted_at', { ascending: false });

    if (error) {
      this.logger.error(
        `consent history failed for ${profileId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de la récupération de l'historique des consentements.",
      );
    }

    return (data ?? []) as ConsentHistoryRow[];
  }

  // ─── Fetch a specific policy version (for modal rendering) ────────

  async getPolicyContent(
    type: ConsentType,
    version?: string,
  ): Promise<PolicyVersionRow> {
    const supabase = this.supabaseService.getServiceClient();

    // If no version specified, return the current one.
    if (!version) {
      const current = await this.getCurrentVersion(type);
      if (!current) {
        throw new NotFoundException(
          `Aucune version publiée pour ce type : ${type}.`,
        );
      }
      return current;
    }

    const { data, error } = await supabase
      .from('policy_versions')
      .select('*')
      .eq('consent_type', type)
      .eq('version', version)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `policy version lookup failed for ${type}@${version}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération de la politique.',
      );
    }
    if (!data) {
      throw new NotFoundException(`Version introuvable : ${type}@${version}.`);
    }
    return data as PolicyVersionRow;
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private applicableConsentTypes(role: string): ConsentType[] {
    const base = [...ALWAYS_REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS];
    if (role === 'educator') {
      // Insert educator-only consents between always-required and
      // optional for nicer UI ordering.
      return [
        ...ALWAYS_REQUIRED_CONSENTS,
        ...EDUCATOR_ONLY_CONSENTS,
        ...OPTIONAL_CONSENTS,
      ];
    }
    return base;
  }

  /** Returns the current (latest by effective_date) version for each type. */
  private async loadCurrentVersions(): Promise<
    Map<ConsentType, PolicyVersionRow>
  > {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('policy_versions')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) {
      this.logger.error(`policy_versions list failed: ${error.message}`);
      return new Map();
    }

    const map = new Map<ConsentType, PolicyVersionRow>();
    for (const row of (data ?? []) as PolicyVersionRow[]) {
      // First hit wins because we sorted DESC — the newest version of
      // each type is the one we keep.
      if (!map.has(row.consent_type)) {
        map.set(row.consent_type, row);
      }
    }
    return map;
  }

  private async getCurrentVersion(
    type: ConsentType,
  ): Promise<PolicyVersionRow | null> {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('policy_versions')
      .select('*')
      .eq('consent_type', type)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as PolicyVersionRow;
  }

  /**
   * Returns a map from consent_type → the version the user has EFFECTIVE
   * accepted (accepted=true, revoked_at IS NULL). Only the most recent
   * accepted row per type is kept.
   */
  private async loadUserAcceptedMap(
    profileId: string,
  ): Promise<Map<ConsentType, string>> {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('user_consents')
      .select('consent_type, version, accepted_at')
      .eq('user_id', profileId)
      .eq('accepted', true)
      .is('revoked_at', null)
      .order('accepted_at', { ascending: false });

    if (error) {
      this.logger.error(
        `loadUserAcceptedMap failed for ${profileId}: ${error.message}`,
      );
      return new Map();
    }

    const map = new Map<ConsentType, string>();
    for (const row of (data ?? []) as {
      consent_type: ConsentType;
      version: string;
      accepted_at: string;
    }[]) {
      if (!map.has(row.consent_type)) {
        map.set(row.consent_type, row.version);
      }
    }
    return map;
  }

  private typeLabel(type: ConsentType): string {
    switch (type) {
      case 'terms_of_use':
        return "conditions d'utilisation";
      case 'privacy_policy':
        return 'politique de confidentialité';
      case 'kyc_verification':
        return "vérification d'identité";
      case 'reference_contact':
        return 'contact des références';
      case 'background_check_storage':
        return 'stockage des antécédents judiciaires';
      case 'marketing_emails':
        return 'communications marketing';
      default:
        return type;
    }
  }
}

/** Exported so other modules can import the list without depending on dto. */
export { CONSENT_TYPES, ConsentType };
