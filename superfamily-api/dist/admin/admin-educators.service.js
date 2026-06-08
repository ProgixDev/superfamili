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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminEducatorsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const notifications_service_1 = require("../notifications/notifications.service");
let AdminEducatorsService = class AdminEducatorsService {
    supabaseService;
    notificationsService;
    constructor(supabaseService, notificationsService) {
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
    }
    async listPendingLicenses(page = 1, limit = 20) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('educator_profiles')
            .select(`id,
         profile_id,
         license_status,
         license_document_url,
         license_submitted_at,
         profiles!educator_profiles_profile_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .eq('license_status', 'pending')
            .order('license_submitted_at', { ascending: true })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des permis en attente.');
        }
        const withSignedUrls = await Promise.all((data || []).map(async (row) => {
            let signedUrl = null;
            if (row.license_document_url) {
                const { data: signed } = await supabase.storage
                    .from('licenses')
                    .createSignedUrl(row.license_document_url, 60 * 15);
                signedUrl = signed?.signedUrl ?? null;
            }
            return { ...row, license_document_signed_url: signedUrl };
        }));
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
    async listEducators(page = 1, limit = 20, search) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        const query = supabase
            .from('educator_profiles')
            .select(`id,
         profile_id,
         license_status,
         created_at,
         profiles!educator_profiles_profile_id_fkey(first_name, last_name, email, is_active)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (search) {
        }
        const { data, error, count } = await query;
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des éducateurs.');
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
    async approveLicense(educatorProfileId, adminProfileId) {
        const supabase = this.supabaseService.getServiceClient();
        const current = await this.loadEducator(educatorProfileId);
        if (current.license_status !== 'pending') {
            throw new common_1.BadRequestException(`Ce permis n'est pas en attente (statut actuel : ${current.license_status}).`);
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
            throw new common_1.BadRequestException("Erreur lors de l'approbation du permis.");
        }
        await this.notificationsService.create({
            profile_id: current.profile_id,
            notification_type: 'license_approved',
            title: 'Permis approuvé',
            message: "Votre permis gouvernemental a été vérifié. Vous pouvez maintenant accueillir jusqu'à 15 enfants simultanément.",
        });
        return data;
    }
    async rejectLicense(educatorProfileId, adminProfileId, reason) {
        if (!reason || reason.trim().length === 0) {
            throw new common_1.BadRequestException('Une raison de rejet est requise.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const current = await this.loadEducator(educatorProfileId);
        if (current.license_status !== 'pending') {
            throw new common_1.BadRequestException(`Ce permis n'est pas en attente (statut actuel : ${current.license_status}).`);
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
            .select('id, license_status, license_reviewed_at, license_rejection_reason')
            .single();
        if (error) {
            throw new common_1.BadRequestException('Erreur lors du rejet du permis.');
        }
        await this.notificationsService.create({
            profile_id: current.profile_id,
            notification_type: 'license_rejected',
            title: 'Permis rejeté',
            message: `Votre permis a été rejeté. Raison : ${reason.trim()}`,
        });
        return data;
    }
    async loadEducator(educatorProfileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_profiles')
            .select('id, profile_id, license_status')
            .eq('id', educatorProfileId)
            .maybeSingle();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de la récupération du profil d'éducateur.");
        }
        if (!data) {
            throw new common_1.NotFoundException("Profil d'éducateur introuvable.");
        }
        return data;
    }
};
exports.AdminEducatorsService = AdminEducatorsService;
exports.AdminEducatorsService = AdminEducatorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService])
], AdminEducatorsService);
//# sourceMappingURL=admin-educators.service.js.map