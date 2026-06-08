"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KycService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycService = exports.KYC_STATUS_CHANGED_EVENT = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const supabase_service_1 = require("../supabase/supabase.service");
const consents_service_1 = require("../consents/consents.service");
const didit_signature_verifier_1 = require("./didit-signature.verifier");
exports.KYC_STATUS_CHANGED_EVENT = 'kyc.status.changed';
let KycService = KycService_1 = class KycService {
    configService;
    supabaseService;
    signatureVerifier;
    eventEmitter;
    consentsService;
    logger = new common_1.Logger(KycService_1.name);
    constructor(configService, supabaseService, signatureVerifier, eventEmitter, consentsService) {
        this.configService = configService;
        this.supabaseService = supabaseService;
        this.signatureVerifier = signatureVerifier;
        this.eventEmitter = eventEmitter;
        this.consentsService = consentsService;
    }
    async createSession(userId) {
        if (!userId) {
            throw new common_1.UnauthorizedException('Profil utilisateur introuvable. Veuillez vous reconnecter.');
        }
        await this.consentsService.requireConsent(userId, 'kyc_verification');
        const baseUrl = this.configService.get('didit.baseUrl');
        const apiKey = this.configService.get('didit.apiKey');
        const workflowId = this.configService.get('didit.workflowId');
        const frontendUrl = this.configService.get('frontendUrl');
        if (!apiKey || !workflowId) {
            this.logger.error('Didit is not configured — DIDIT_API_KEY or DIDIT_WORKFLOW_ID is missing');
            throw new common_1.InternalServerErrorException("Le service de vérification d'identité n'est pas configuré.");
        }
        const body = {
            workflow_id: workflowId,
            vendor_data: userId,
            callback: `${frontendUrl}/fr/educateur/inscription/verification`,
            metadata: {
                platform: 'superfamily',
                user_type: 'educator',
            },
        };
        let response;
        try {
            response = await fetch(`${baseUrl}/v3/session/`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify(body),
            });
        }
        catch (err) {
            this.logger.error(`Didit network error: ${err instanceof Error ? err.message : String(err)}`);
            throw new common_1.BadGatewayException('Impossible de contacter le service de vérification. Veuillez réessayer.');
        }
        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            this.logger.error(`Didit returned ${response.status}: ${errText.slice(0, 500)}`);
            if (response.status === 429) {
                throw new common_1.BadRequestException('Trop de tentatives de vérification. Veuillez réessayer dans quelques minutes.');
            }
            throw new common_1.BadGatewayException('Erreur lors de la création de la session de vérification.');
        }
        const diditSession = await response.json();
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
            this.logger.error(`Failed to persist kyc_verifications row: ${error.message}`);
            throw new common_1.InternalServerErrorException("Erreur lors de l'enregistrement de la session de vérification.");
        }
        this.emitStatusChanged(userId, 'in_progress', null);
        this.logger.log(`Created KYC session ${diditSession.session_id} for user ${userId} (row ${row.id})`);
        return {
            sessionId: diditSession.session_id,
            verificationUrl: diditSession.url,
            expiresAt: null,
        };
    }
    async getSessionStatus(userId) {
        if (!userId) {
            throw new common_1.UnauthorizedException('Profil utilisateur introuvable.');
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
            this.logger.error(`Failed to fetch latest kyc_verifications row for ${userId}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération du statut de vérification.');
        }
        return data ?? null;
    }
    async pollStatus(userId) {
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
    async handleWebhook(rawBody, headers) {
        const secret = this.configService.get('didit.webhookSecret');
        const tolerance = this.configService.get('didit.webhookTimestampToleranceSeconds');
        if (!secret) {
            this.logger.error('DIDIT_WEBHOOK_SECRET is not configured — refusing to process webhooks');
            throw new common_1.UnauthorizedException('Webhook secret not configured.');
        }
        const ok = this.signatureVerifier.verify(rawBody, headers, secret, tolerance ?? 300);
        if (!ok) {
            throw new common_1.UnauthorizedException('Invalid Didit webhook signature.');
        }
        let payload;
        try {
            payload = JSON.parse(rawBody.toString('utf8'));
        }
        catch {
            throw new common_1.BadRequestException('Webhook body is not valid JSON.');
        }
        const eventType = payload.webhook_type;
        this.logger.log(`Didit webhook ${eventType} for session=${payload.session_id ?? '?'} status=${payload.status ?? '?'}`);
        if (eventType !== 'status.updated' && eventType !== 'data.updated') {
            return;
        }
        if (!payload.session_id) {
            this.logger.warn(`status.updated event with no session_id — ignoring`);
            return;
        }
        const supabase = this.supabaseService.getServiceClient();
        const { data: existing, error: lookupError } = await supabase
            .from('kyc_verifications')
            .select('id, user_id, status')
            .eq('didit_session_id', payload.session_id)
            .maybeSingle();
        if (lookupError) {
            this.logger.error(`kyc_verifications lookup failed for session ${payload.session_id}: ${lookupError.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération de la session.');
        }
        const userId = existing?.user_id ?? payload.vendor_data ?? null;
        if (!userId) {
            this.logger.warn(`Webhook for session ${payload.session_id} has no associated user (no row, no vendor_data) — dropping`);
            return;
        }
        const newStatus = this.mapDiditStatus(payload.status);
        const decision = payload.decision;
        const extracted = this.extractDecisionFields(decision);
        if (existing &&
            existing.status === newStatus &&
            extracted.confidence_score === null) {
            this.logger.log(`Webhook for session ${payload.session_id} is a no-op replay (status unchanged) — ACK`);
            return;
        }
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
            raw_webhook_payload: payload,
            completed_at: this.isTerminal(newStatus)
                ? new Date().toISOString()
                : null,
        };
        const { error: upsertError } = await supabase
            .from('kyc_verifications')
            .upsert(upsertPayload, { onConflict: 'didit_session_id' });
        if (upsertError) {
            this.logger.error(`kyc_verifications upsert failed for session ${payload.session_id}: ${upsertError.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la sauvegarde de la session.');
        }
        const minConfidence = this.configService.get('didit.minConfidenceScore') ?? 70;
        if (newStatus === 'approved' &&
            (extracted.confidence_score === null ||
                extracted.confidence_score >= minConfidence)) {
            await this.updateEducatorMirror(userId, 'approved');
        }
        else if (newStatus === 'declined') {
            await this.updateEducatorMirror(userId, 'declined');
        }
        else if (newStatus === 'review_required') {
            await this.updateEducatorMirror(userId, 'review_required');
        }
        else if (newStatus === 'in_progress') {
            await this.updateEducatorMirror(userId, 'in_progress');
        }
        this.emitStatusChanged(userId, newStatus, extracted.confidence_score);
    }
    mapDiditStatus(diditStatus) {
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
    isTerminal(status) {
        return (status === 'approved' ||
            status === 'declined' ||
            status === 'expired' ||
            status === 'review_required');
    }
    extractDecisionFields(decision) {
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
        const scores = [];
        if (typeof idDoc?.front_image_quality_score?.overall_score === 'number') {
            scores.push(idDoc.front_image_quality_score.overall_score);
        }
        if (typeof liveness?.score === 'number')
            scores.push(liveness.score);
        if (typeof faceMatch?.score === 'number')
            scores.push(faceMatch.score);
        const confidenceScore = scores.length > 0 ? Math.min(...scores) : null;
        const fullName = idDoc?.first_name || idDoc?.last_name
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
    async updateEducatorMirror(userId, newStatus) {
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase
            .from('educator_profiles')
            .update({
            kyc_status: newStatus,
            kyc_verified_at: newStatus === 'approved' ? new Date().toISOString() : null,
        })
            .eq('profile_id', userId);
        if (error) {
            this.logger.error(`Failed to mirror kyc_status onto educator_profiles for ${userId}: ${error.message}`);
        }
    }
    emitStatusChanged(userId, status, confidenceScore) {
        const evt = { userId, status, confidenceScore };
        this.eventEmitter.emit(exports.KYC_STATUS_CHANGED_EVENT, evt);
    }
};
exports.KycService = KycService;
exports.KycService = KycService = KycService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        supabase_service_1.SupabaseService,
        didit_signature_verifier_1.DiditSignatureVerifier,
        event_emitter_1.EventEmitter2,
        consents_service_1.ConsentsService])
], KycService);
//# sourceMappingURL=kyc.service.js.map