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
exports.AdminVerificationsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const notifications_service_1 = require("../notifications/notifications.service");
let AdminVerificationsService = class AdminVerificationsService {
    supabaseService;
    notificationsService;
    constructor(supabaseService, notificationsService) {
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
    }
    async listPending(page = 1, limit = 20) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('educator_verifications')
            .select('*, educator_profiles(profiles!educator_profiles_profile_id_fkey(first_name, last_name, email))', { count: 'exact' })
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des vérifications');
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
    async approve(verificationId, adminProfileId) {
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
            throw new common_1.BadRequestException("Erreur lors de l'approbation de la vérification");
        }
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
    async reject(verificationId, adminProfileId, reason) {
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
            throw new common_1.BadRequestException('Erreur lors du rejet de la vérification');
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
};
exports.AdminVerificationsService = AdminVerificationsService;
exports.AdminVerificationsService = AdminVerificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService])
], AdminVerificationsService);
//# sourceMappingURL=admin-verifications.service.js.map