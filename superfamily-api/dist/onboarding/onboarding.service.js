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
var OnboardingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let OnboardingService = OnboardingService_1 = class OnboardingService {
    supabaseService;
    logger = new common_1.Logger(OnboardingService_1.name);
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getMine(profileId) {
        if (!profileId) {
            throw new common_1.ForbiddenException('Profil utilisateur introuvable.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { data: existing, error: readError } = await supabase
            .from('user_onboarding')
            .select('*')
            .eq('user_id', profileId)
            .maybeSingle();
        if (readError) {
            this.logger.error(`user_onboarding read failed for ${profileId}: ${readError.message}`);
            throw new common_1.InternalServerErrorException("Erreur lors de la récupération de l'état d'onboarding.");
        }
        if (existing)
            return existing;
        const { data: created, error: insertError } = await supabase
            .from('user_onboarding')
            .insert({ user_id: profileId })
            .select('*')
            .single();
        if (insertError || !created) {
            const { data: retry } = await supabase
                .from('user_onboarding')
                .select('*')
                .eq('user_id', profileId)
                .maybeSingle();
            if (retry)
                return retry;
            this.logger.error(`user_onboarding lazy insert failed for ${profileId}: ${insertError?.message}`);
            throw new common_1.InternalServerErrorException("Erreur lors de l'initialisation de l'état d'onboarding.");
        }
        return created;
    }
    async updateMine(profileId, dto) {
        if (!profileId) {
            throw new common_1.ForbiddenException('Profil utilisateur introuvable.');
        }
        await this.getMine(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const updates = {};
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
            this.logger.error(`user_onboarding update failed for ${profileId}: ${error?.message}`);
            throw new common_1.InternalServerErrorException("Erreur lors de la mise à jour de l'état d'onboarding.");
        }
        return data;
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = OnboardingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map