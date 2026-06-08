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
var DocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = exports.EXPIRY_WARNING_WINDOW_DAYS = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const notifications_service_1 = require("../notifications/notifications.service");
const consents_service_1 = require("../consents/consents.service");
const BUCKET = 'educator-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
];
const SIGNED_URL_TTL_SECONDS = 60 * 60;
exports.EXPIRY_WARNING_WINDOW_DAYS = 30;
let DocumentsService = DocumentsService_1 = class DocumentsService {
    supabaseService;
    notificationsService;
    consentsService;
    logger = new common_1.Logger(DocumentsService_1.name);
    constructor(supabaseService, notificationsService, consentsService) {
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
        this.consentsService = consentsService;
    }
    async uploadDocument(profileId, file, body) {
        if (!file) {
            throw new common_1.BadRequestException('Aucun fichier fourni.');
        }
        this.validateFile(file);
        if (body.type === 'background_check') {
            await this.consentsService.requireConsent(profileId, 'background_check_storage');
        }
        if ((body.type === 'background_check' || body.type === 'cpr_certification') &&
            !body.issued_date) {
            throw new common_1.BadRequestException("La date d'émission est requise pour ce type de document.");
        }
        if (body.type === 'background_check' && body.issued_date) {
            const issued = new Date(body.issued_date);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            if (issued < sixMonthsAgo) {
                throw new common_1.BadRequestException("L'attestation d'antécédents judiciaires doit dater de moins de 6 mois.");
            }
        }
        const educatorId = await this.resolveEducatorId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const ext = this.pickExtension(file);
        const storageKey = `${educatorId}/${body.type}/${(0, crypto_1.randomUUID)()}${ext}`;
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storageKey, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });
        if (uploadError) {
            this.logger.error(`Storage upload failed for educator ${educatorId}: ${uploadError.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors du téléversement du fichier.');
        }
        const expiresAt = this.computeExpiresAt(body.type, body.issued_date);
        const { data, error: insertError } = await supabase
            .from('educator_documents')
            .insert({
            educator_id: educatorId,
            document_type: body.type,
            file_url: storageKey,
            file_size_bytes: file.size,
            mime_type: file.mimetype,
            status: 'pending_review',
            issued_date: body.issued_date ?? null,
            expires_at: expiresAt?.toISOString() ?? null,
        })
            .select('*')
            .single();
        if (insertError || !data) {
            this.logger.error(`educator_documents insert failed: ${insertError?.message ?? 'unknown'}`);
            await supabase.storage
                .from(BUCKET)
                .remove([storageKey])
                .then(() => undefined)
                .catch((err) => this.logger.warn(`Orphaned file cleanup failed (${storageKey}): ${err}`));
            throw new common_1.InternalServerErrorException("Erreur lors de l'enregistrement du document.");
        }
        return data;
    }
    async listMine(profileId) {
        const educatorId = await this.resolveEducatorId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_documents')
            .select('*')
            .eq('educator_id', educatorId)
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error(`educator_documents list failed for educator ${educatorId}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération de vos documents.');
        }
        return this.attachSignedUrls((data ?? []));
    }
    async deleteMine(profileId, documentId) {
        const educatorId = await this.resolveEducatorId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { data: doc, error: fetchError } = await supabase
            .from('educator_documents')
            .select('id, educator_id, status, file_url')
            .eq('id', documentId)
            .maybeSingle();
        if (fetchError) {
            this.logger.error(`educator_documents lookup failed for ${documentId}: ${fetchError.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération du document.');
        }
        if (!doc) {
            throw new common_1.NotFoundException('Document introuvable.');
        }
        if (doc.educator_id !== educatorId) {
            throw new common_1.ForbiddenException("Vous n'êtes pas autorisé à supprimer ce document.");
        }
        if (doc.status !== 'pending_review') {
            throw new common_1.BadRequestException('Seuls les documents en attente de révision peuvent être supprimés.');
        }
        const { error: deleteRowError } = await supabase
            .from('educator_documents')
            .delete()
            .eq('id', documentId);
        if (deleteRowError) {
            this.logger.error(`educator_documents delete failed for ${documentId}: ${deleteRowError.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la suppression du document.');
        }
        await supabase.storage
            .from(BUCKET)
            .remove([doc.file_url])
            .then(() => undefined)
            .catch((err) => this.logger.warn(`Storage cleanup failed after row delete (${doc.file_url}): ${err}`));
    }
    async listForAdmin(params) {
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;
        const offset = (page - 1) * limit;
        const supabase = this.supabaseService.getServiceClient();
        let query = supabase
            .from('educator_documents')
            .select(`*,
         educator_profiles!inner(
           id,
           profile_id,
           profiles!educator_profiles_profile_id_fkey(first_name, last_name, email)
         )`, { count: 'exact' })
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);
        if (params.status) {
            query = query.eq('status', params.status);
        }
        else {
            query = query.eq('status', 'pending_review');
        }
        if (params.type) {
            query = query.eq('document_type', params.type);
        }
        const { data, error, count } = await query;
        if (error) {
            this.logger.error(`admin educator_documents list failed: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération des documents.');
        }
        const withSigned = await this.attachSignedUrls((data ?? []));
        return {
            data: withSigned,
            meta: {
                page,
                limit,
                total: count ?? 0,
                totalPages: Math.ceil((count ?? 0) / limit),
            },
        };
    }
    async approve(documentId, adminProfileId) {
        const supabase = this.supabaseService.getServiceClient();
        const current = await this.loadForAdminAction(documentId);
        if (current.status !== 'pending_review') {
            throw new common_1.BadRequestException(`Ce document n'est pas en attente de révision (statut actuel : ${current.status}).`);
        }
        const { data, error } = await supabase
            .from('educator_documents')
            .update({
            status: 'approved',
            reviewed_by: adminProfileId,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null,
        })
            .eq('id', documentId)
            .select('*')
            .single();
        if (error || !data) {
            this.logger.error(`educator_documents approve failed for ${documentId}: ${error?.message}`);
            throw new common_1.InternalServerErrorException("Erreur lors de l'approbation du document.");
        }
        await this.notifyEducator(current.educator_id, 'Document approuvé', `Votre ${this.documentTypeLabel(current.document_type)} a été approuvé.`);
        return data;
    }
    async reject(documentId, adminProfileId, reason) {
        if (!reason || reason.trim().length === 0) {
            throw new common_1.BadRequestException('Une raison de rejet est requise.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const current = await this.loadForAdminAction(documentId);
        if (current.status !== 'pending_review') {
            throw new common_1.BadRequestException(`Ce document n'est pas en attente de révision (statut actuel : ${current.status}).`);
        }
        const { data, error } = await supabase
            .from('educator_documents')
            .update({
            status: 'rejected',
            reviewed_by: adminProfileId,
            reviewed_at: new Date().toISOString(),
            rejection_reason: reason.trim(),
        })
            .eq('id', documentId)
            .select('*')
            .single();
        if (error || !data) {
            this.logger.error(`educator_documents reject failed for ${documentId}: ${error?.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors du rejet du document.');
        }
        await this.notifyEducator(current.educator_id, 'Document rejeté', `Votre ${this.documentTypeLabel(current.document_type)} a été rejeté. Raison : ${reason.trim()}`);
        return data;
    }
    async findExpiringSoon() {
        const supabase = this.supabaseService.getServiceClient();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + exports.EXPIRY_WARNING_WINDOW_DAYS);
        const { data, error } = await supabase
            .from('educator_documents')
            .select('*')
            .eq('status', 'approved')
            .not('expires_at', 'is', null)
            .gt('expires_at', new Date().toISOString())
            .lt('expires_at', cutoff.toISOString());
        if (error) {
            this.logger.error(`findExpiringSoon query failed: ${error.message}`);
            return [];
        }
        return (data ?? []);
    }
    async findNewlyExpired() {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_documents')
            .select('*')
            .eq('status', 'approved')
            .not('expires_at', 'is', null)
            .lte('expires_at', new Date().toISOString());
        if (error) {
            this.logger.error(`findNewlyExpired query failed: ${error.message}`);
            return [];
        }
        return (data ?? []);
    }
    async markExpired(ids) {
        if (ids.length === 0)
            return;
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase
            .from('educator_documents')
            .update({ status: 'expired' })
            .in('id', ids);
        if (error) {
            this.logger.error(`markExpired failed: ${error.message}`);
        }
    }
    async notifyEducatorForDocument(row, title, message) {
        await this.notifyEducator(row.educator_id, title, message);
    }
    validateFile(file) {
        if (file.size > MAX_FILE_SIZE) {
            throw new common_1.BadRequestException('Fichier trop volumineux. Taille maximale : 10 Mo.');
        }
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Type de fichier non autorisé. Utilisez PDF, JPG, PNG ou WebP.');
        }
    }
    pickExtension(file) {
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
    computeExpiresAt(type, issuedDate) {
        if (!issuedDate)
            return null;
        const issued = new Date(issuedDate);
        const out = new Date(issued);
        switch (type) {
            case 'background_check':
                out.setMonth(out.getMonth() + 6);
                return out;
            case 'cpr_certification':
                out.setFullYear(out.getFullYear() + 3);
                return out;
            case 'birth_certificate':
            case 'work_authorization':
            case 'secondary_id':
            case 'diploma':
                return null;
            default:
                return null;
        }
    }
    async attachSignedUrls(rows) {
        const supabase = this.supabaseService.getServiceClient();
        return Promise.all(rows.map(async (row) => {
            const { data: signed } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(row.file_url, SIGNED_URL_TTL_SECONDS);
            return { ...row, signed_url: signed?.signedUrl ?? null };
        }));
    }
    async resolveEducatorId(profileId) {
        if (!profileId) {
            throw new common_1.ForbiddenException('Profil utilisateur introuvable.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_profiles')
            .select('id')
            .eq('profile_id', profileId)
            .maybeSingle();
        if (error) {
            this.logger.error(`educator_profiles lookup failed for ${profileId}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la vérification du profil.');
        }
        if (!data) {
            throw new common_1.ForbiddenException('Aucun profil éducateur associé à ce compte.');
        }
        return data.id;
    }
    async loadForAdminAction(documentId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_documents')
            .select('*')
            .eq('id', documentId)
            .maybeSingle();
        if (error) {
            this.logger.error(`educator_documents load failed for ${documentId}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération du document.');
        }
        if (!data) {
            throw new common_1.NotFoundException('Document introuvable.');
        }
        return data;
    }
    async notifyEducator(educatorId, title, message) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: ep } = await supabase
            .from('educator_profiles')
            .select('profile_id')
            .eq('id', educatorId)
            .maybeSingle();
        if (!ep?.profile_id) {
            this.logger.warn(`Cannot notify educator ${educatorId} — no matching educator_profiles row`);
            return;
        }
        await this.notificationsService.create({
            profile_id: ep.profile_id,
            notification_type: 'document_review',
            title,
            message,
        });
    }
    documentTypeLabel(type) {
        switch (type) {
            case 'background_check':
                return "attestation d'antécédents judiciaires";
            case 'birth_certificate':
                return 'certificat de naissance';
            case 'cpr_certification':
                return 'secourisme petite enfance';
            case 'work_authorization':
                return 'preuve de citoyenneté ou de permis de travail valide';
            case 'secondary_id':
                return "pièce d'identité secondaire";
            case 'diploma':
                return 'diplôme ou attestation de formation';
            default:
                return 'document';
        }
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = DocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService,
        consents_service_1.ConsentsService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map