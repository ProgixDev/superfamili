import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentsService } from '../consents/consents.service';
import { DiditSignatureVerifier } from './didit-signature.verifier';
import {
  DiditCreateSessionRequest,
  DiditCreateSessionResponse,
} from './interfaces/didit-session.interface';
import {
  DiditDecision,
  DiditSessionStatus,
  DiditWebhookEnvelope,
  DiditWebhookType,
} from './interfaces/didit-webhook-payload.interface';

/** DB row shape — mirrors the `kyc_verifications` table exactly. */
export interface KycVerification {
  id: string;
  user_id: string;
  didit_session_id: string | null;
  didit_session_url: string | null;
  status:
    | 'not_started'
    | 'in_progress'
    | 'approved'
    | 'declined'
    | 'expired'
    | 'review_required';
  confidence_score: number | null;
  decision: string | null;
  id_document_type: string | null;
  id_document_country: string | null;
  extracted_full_name: string | null;
  extracted_date_of_birth: string | null;
  extracted_document_number: string | null;
  raw_webhook_payload: unknown;
  expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycStatusResponse {
  status: KycVerification['status'];
  confidence_score: number | null;
  decision: string | null;
  completed_at: string | null;
  didit_session_url: string | null;
}

/**
 * Event emitted whenever a KYC row transitions status. The `KycGateway`
 * listens and pushes a `kyc:status-updated` frame to the user's socket room
 * so the frontend doesn't have to poll.
 */
export const KYC_STATUS_CHANGED_EVENT = 'kyc.status.changed';
export interface KycStatusChangedEvent {
  userId: string;
  status: KycVerification['status'];
  confidenceScore: number | null;
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly signatureVerifier: DiditSignatureVerifier,
    private readonly eventEmitter: EventEmitter2,
    private readonly consentsService: ConsentsService,
  ) {}

  // ─── 1. Create a new verification session ────────────────────────────

  /**
   * Starts a Didit session for the given user. Returns the URL the user
   * should open (Unilink — handoffs to mobile). Also persists an
   * `in_progress` row in `kyc_verifications` so the webhook handler can
   * find it later.
   */
  async createSession(userId: string): Promise<{
    sessionId: string;
    verificationUrl: string;
    expiresAt: Date | null;
  }> {
    if (!userId) {
      throw new UnauthorizedException(
        'Profil utilisateur introuvable. Veuillez vous reconnecter.',
      );
    }

    // Gate: the educator must have accepted the KYC verification consent
    // for the current policy version before we create a Didit session.
    // Frontend shows a modal before calling this — the gate here is
    // defense in depth for anyone bypassing the UI.
    await this.consentsService.requireConsent(userId, 'kyc_verification');

    const baseUrl = this.configService.get<string>('didit.baseUrl');
    const apiKey = this.configService.get<string>('didit.apiKey');
    const workflowId = this.configService.get<string>('didit.workflowId');
    const frontendUrl = this.configService.get<string>('frontendUrl');

    if (!apiKey || !workflowId) {
      this.logger.error(
        'Didit is not configured — DIDIT_API_KEY or DIDIT_WORKFLOW_ID is missing',
      );
      throw new InternalServerErrorException(
        "Le service de vérification d'identité n'est pas configuré.",
      );
    }

    // ── Build the Didit request body ──────────────────────────────────
    // `vendor_data` is the breadcrumb that lets the webhook handler find
    // this row again — must be the profiles.id so it matches what we
    // insert into kyc_verifications.user_id.
    //
    // `callback` is the USER-FACING redirect URL — where Didit sends the
    // user's browser after they finish the flow on their phone. It must
    // point at the frontend, NOT at /kyc/webhook (which is the
    // server-to-server webhook endpoint, configured separately in the
    // Didit console). The educator verification page reads the returned
    // `?session_id=…&status=…` query params to surface the result.
    const body: DiditCreateSessionRequest = {
      workflow_id: workflowId,
      vendor_data: userId,
      callback: `${frontendUrl}/fr/educateur/inscription/verification`,
      metadata: {
        platform: 'superfamily',
        user_type: 'educator',
      },
    };

    // ── Call Didit ────────────────────────────────────────────────────
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v3/session/`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(
        `Didit network error: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException(
        'Impossible de contacter le service de vérification. Veuillez réessayer.',
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      this.logger.error(
        `Didit returned ${response.status}: ${errText.slice(0, 500)}`,
      );
      if (response.status === 429) {
        throw new BadRequestException(
          'Trop de tentatives de vérification. Veuillez réessayer dans quelques minutes.',
        );
      }
      throw new BadGatewayException(
        'Erreur lors de la création de la session de vérification.',
      );
    }

    const diditSession: DiditCreateSessionResponse = await response.json();

    // ── Insert the kyc_verifications row ──────────────────────────────
    // This is a new session per call — we don't upsert an existing row,
    // we create a fresh one. Historical sessions stay in the audit trail.
    const supabase = this.supabaseService.getServiceClient();
    const { data: row, error } = await supabase
      .from('kyc_verifications')
      .insert({
        user_id: userId,
        didit_session_id: diditSession.session_id,
        didit_session_url: diditSession.url,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        raw_webhook_payload: null,
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(
        `Failed to persist kyc_verifications row: ${error.message}`,
      );
      // The Didit session exists but we couldn't record it. That's
      // recoverable — the webhook will still arrive, and by then the row
      // is missing. We degrade by throwing so the user retries, which
      // creates a new session (Didit doesn't charge per abandoned one).
      throw new InternalServerErrorException(
        "Erreur lors de l'enregistrement de la session de vérification.",
      );
    }

    // ── Fire the initial status event so the UI flips to "in progress"
    this.emitStatusChanged(userId, 'in_progress', null);

    this.logger.log(
      `Created KYC session ${diditSession.session_id} for user ${userId} (row ${row.id})`,
    );

    return {
      sessionId: diditSession.session_id,
      verificationUrl: diditSession.url,
      // Didit doesn't expose expires_at on the create response; callers
      // should treat sessions as valid until the webhook says otherwise.
      expiresAt: null,
    };
  }

  // ─── 2. Read the most recent session for a user ──────────────────────

  async getSessionStatus(userId: string): Promise<KycVerification | null> {
    if (!userId) {
      throw new UnauthorizedException('Profil utilisateur introuvable.');
    }

    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch latest kyc_verifications row for ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération du statut de vérification.',
      );
    }

    return (data as KycVerification) ?? null;
  }

  // ─── 3. Polling endpoint for the desktop UI ──────────────────────────

  async pollStatus(userId: string): Promise<KycStatusResponse> {
    const latest = await this.getSessionStatus(userId);
    if (!latest) {
      return {
        status: 'not_started',
        confidence_score: null,
        decision: null,
        completed_at: null,
        didit_session_url: null,
      };
    }
    return {
      status: latest.status,
      confidence_score: latest.confidence_score,
      decision: latest.decision,
      completed_at: latest.completed_at,
      didit_session_url: latest.didit_session_url,
    };
  }

  // ─── 4. Process an incoming Didit webhook ────────────────────────────

  /**
   * Verifies the HMAC signature, extracts the session data, and upserts
   * the matching kyc_verifications row. Safe to call repeatedly with the
   * same event — we write whichever state is newest and flip a flag on
   * educator_profiles exactly once per transition.
   *
   * The signature check uses the RAW body (Buffer), not the parsed JSON,
   * because that's what was actually signed. The caller (webhook
   * controller) is responsible for reading the raw body via `@RawBody()`.
   */
  async handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    const secret = this.configService.get<string>('didit.webhookSecret');
    const tolerance = this.configService.get<number>(
      'didit.webhookTimestampToleranceSeconds',
    );

    if (!secret) {
      this.logger.error(
        'DIDIT_WEBHOOK_SECRET is not configured — refusing to process webhooks',
      );
      throw new UnauthorizedException('Webhook secret not configured.');
    }

    const ok = this.signatureVerifier.verify(
      rawBody,
      headers,
      secret,
      tolerance ?? 300,
    );
    if (!ok) {
      throw new UnauthorizedException('Invalid Didit webhook signature.');
    }

    // ── Parse after verification ──────────────────────────────────────
    let payload: DiditWebhookEnvelope;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Webhook body is not valid JSON.');
    }

    const eventType = payload.webhook_type;
    this.logger.log(
      `Didit webhook ${eventType} for session=${payload.session_id ?? '?'} status=${payload.status ?? '?'}`,
    );

    // We only act on session state updates. The other event types are
    // logged at info level and acknowledged — Didit shouldn't retry them.
    if (eventType !== 'status.updated' && eventType !== 'data.updated') {
      return;
    }

    if (!payload.session_id) {
      this.logger.warn(`status.updated event with no session_id — ignoring`);
      return;
    }

    // ── Find the matching kyc_verifications row ───────────────────────
    // Prefer didit_session_id lookup. Fall back to vendor_data if the row
    // wasn't persisted (e.g., createSession crashed after Didit accepted
    // but before we wrote the row).
    const supabase = this.supabaseService.getServiceClient();

    const { data: existing, error: lookupError } = await supabase
      .from('kyc_verifications')
      .select('id, user_id, status')
      .eq('didit_session_id', payload.session_id)
      .maybeSingle();

    if (lookupError) {
      this.logger.error(
        `kyc_verifications lookup failed for session ${payload.session_id}: ${lookupError.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération de la session.',
      );
    }

    // Resolve the user_id we'll write into the row. If the row exists,
    // use its user_id. Otherwise fall back to vendor_data (which we set
    // to profiles.id at create time).
    const userId = existing?.user_id ?? payload.vendor_data ?? null;
    if (!userId) {
      this.logger.warn(
        `Webhook for session ${payload.session_id} has no associated user (no row, no vendor_data) — dropping`,
      );
      return;
    }

    // ── Map Didit status → our enum ───────────────────────────────────
    const newStatus = this.mapDiditStatus(payload.status);
    const decision = payload.decision;
    const extracted = this.extractDecisionFields(decision);

    // ── Idempotency: if nothing changed, skip the write + event ──────
    if (
      existing &&
      existing.status === newStatus &&
      extracted.confidence_score === null
    ) {
      this.logger.log(
        `Webhook for session ${payload.session_id} is a no-op replay (status unchanged) — ACK`,
      );
      return;
    }

    // ── Upsert the row (insert if missing, update if present) ─────────
    const upsertPayload = {
      user_id: userId,
      didit_session_id: payload.session_id,
      didit_session_url: decision?.session_url ?? undefined,
      status: newStatus,
      decision: payload.status ?? null,
      confidence_score: extracted.confidence_score,
      id_document_type: extracted.id_document_type,
      id_document_country: extracted.id_document_country,
      extracted_full_name: extracted.extracted_full_name,
      extracted_date_of_birth: extracted.extracted_date_of_birth,
      extracted_document_number: extracted.extracted_document_number,
      raw_webhook_payload: payload as unknown as Record<string, unknown>,
      completed_at: this.isTerminal(newStatus)
        ? new Date().toISOString()
        : null,
    };

    const { error: upsertError } = await supabase
      .from('kyc_verifications')
      .upsert(upsertPayload, { onConflict: 'didit_session_id' });

    if (upsertError) {
      this.logger.error(
        `kyc_verifications upsert failed for session ${payload.session_id}: ${upsertError.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la sauvegarde de la session.',
      );
    }

    // ── Mirror onto educator_profiles ─────────────────────────────────
    // We only flip the mirror column if the auto-approve threshold is met
    // on Approved, or on explicit Declined. Intermediate states update
    // kyc_verifications only.
    const minConfidence =
      this.configService.get<number>('didit.minConfidenceScore') ?? 70;

    if (
      newStatus === 'approved' &&
      (extracted.confidence_score === null ||
        extracted.confidence_score >= minConfidence)
    ) {
      await this.updateEducatorMirror(userId, 'approved');
    } else if (newStatus === 'declined') {
      await this.updateEducatorMirror(userId, 'declined');
    } else if (newStatus === 'review_required') {
      await this.updateEducatorMirror(userId, 'review_required');
    } else if (newStatus === 'in_progress') {
      await this.updateEducatorMirror(userId, 'in_progress');
    }

    // ── Fire the WebSocket event ──────────────────────────────────────
    this.emitStatusChanged(userId, newStatus, extracted.confidence_score);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private mapDiditStatus(
    diditStatus: DiditSessionStatus | undefined,
  ): KycVerification['status'] {
    switch (diditStatus) {
      case 'Approved':
        return 'approved';
      case 'Declined':
        return 'declined';
      case 'In Review':
        return 'review_required';
      case 'In Progress':
        return 'in_progress';
      case 'Abandoned':
        return 'expired';
      case 'Not Started':
      default:
        return 'not_started';
    }
  }

  private isTerminal(status: KycVerification['status']): boolean {
    return (
      status === 'approved' ||
      status === 'declined' ||
      status === 'expired' ||
      status === 'review_required'
    );
  }

  /**
   * Pulls the handful of fields we store in typed columns out of Didit's
   * nested decision object. Everything else lives in raw_webhook_payload.
   *
   * `confidence_score` is computed as the minimum of the available sub-check
   * scores (ID verification, liveness, face match) — if any is low, the
   * overall score is low. Missing scores are skipped.
   */
  private extractDecisionFields(decision: DiditDecision | undefined): {
    confidence_score: number | null;
    id_document_type: string | null;
    id_document_country: string | null;
    extracted_full_name: string | null;
    extracted_date_of_birth: string | null;
    extracted_document_number: string | null;
  } {
    if (!decision) {
      return {
        confidence_score: null,
        id_document_type: null,
        id_document_country: null,
        extracted_full_name: null,
        extracted_date_of_birth: null,
        extracted_document_number: null,
      };
    }

    const idDoc = decision.id_verifications?.[0];
    const liveness = decision.liveness_checks?.[0];
    const faceMatch = decision.face_matches?.[0];

    const scores: number[] = [];
    if (typeof idDoc?.front_image_quality_score?.overall_score === 'number') {
      scores.push(idDoc.front_image_quality_score.overall_score);
    }
    if (typeof liveness?.score === 'number') scores.push(liveness.score);
    if (typeof faceMatch?.score === 'number') scores.push(faceMatch.score);
    const confidenceScore = scores.length > 0 ? Math.min(...scores) : null;

    const fullName =
      idDoc?.first_name || idDoc?.last_name
        ? `${idDoc.first_name ?? ''} ${idDoc.last_name ?? ''}`.trim()
        : null;

    return {
      confidence_score: confidenceScore,
      id_document_type: idDoc?.document_type ?? null,
      id_document_country: idDoc?.issuing_state ?? null,
      extracted_full_name: fullName,
      extracted_date_of_birth: idDoc?.date_of_birth ?? null,
      extracted_document_number: idDoc?.document_number ?? null,
    };
  }

  /** Updates the `kyc_status` mirror column on the user's educator_profile. */
  private async updateEducatorMirror(
    userId: string,
    newStatus: KycVerification['status'],
  ): Promise<void> {
    const supabase = this.supabaseService.getServiceClient();

    // Only educator profiles have the mirror column. If this user is a
    // parent, the update is a no-op and we log and move on.
    const { error } = await supabase
      .from('educator_profiles')
      .update({
        kyc_status: newStatus,
        kyc_verified_at:
          newStatus === 'approved' ? new Date().toISOString() : null,
      })
      .eq('profile_id', userId);

    if (error) {
      this.logger.error(
        `Failed to mirror kyc_status onto educator_profiles for ${userId}: ${error.message}`,
      );
      // Non-fatal — the source of truth is kyc_verifications.
    }
  }

  private emitStatusChanged(
    userId: string,
    status: KycVerification['status'],
    confidenceScore: number | null,
  ): void {
    const evt: KycStatusChangedEvent = { userId, status, confidenceScore };
    this.eventEmitter.emit(KYC_STATUS_CHANGED_EVENT, evt);
  }
}
