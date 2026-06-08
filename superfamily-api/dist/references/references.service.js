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
var ReferencesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferencesService = exports.MAX_REFERENCES_PER_EDUCATOR = exports.MIN_REFERENCES_FOR_ACTIVATION = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const consents_service_1 = require("../consents/consents.service");
exports.MIN_REFERENCES_FOR_ACTIVATION = 0;
exports.MAX_REFERENCES_PER_EDUCATOR = 5;
const URL_REGEX = /(https?:\/\/|www\.|\.com|\.ca|\.fr|\.org|\.net)/i;
const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w-]+/;
let ReferencesService = ReferencesService_1 = class ReferencesService {
    supabaseService;
    consentsService;
    logger = new common_1.Logger(ReferencesService_1.name);
    constructor(supabaseService, consentsService) {
        this.supabaseService = supabaseService;
        this.consentsService = consentsService;
    }
    async listForEducator(profileId) {
        const educatorId = await this.resolveEducatorId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_references')
            .select('*')
            .eq('educator_id', educatorId)
            .order('created_at', { ascending: true });
        if (error) {
            this.logger.error(`list references failed for educator ${educatorId}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération des références.');
        }
        return (data ?? []);
    }
    async create(profileId, dto) {
        await this.consentsService.requireConsent(profileId, 'reference_contact');
        this.validateSpam(dto.testimonial);
        const educatorId = await this.resolveEducatorId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { count } = await supabase
            .from('educator_references')
            .select('id', { count: 'exact', head: true })
            .eq('educator_id', educatorId);
        if ((count ?? 0) >= exports.MAX_REFERENCES_PER_EDUCATOR) {
            throw new common_1.BadRequestException(`Vous avez atteint le maximum de ${exports.MAX_REFERENCES_PER_EDUCATOR} références.`);
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
            if (error?.message?.includes('Maximum 5')) {
                throw new common_1.BadRequestException(error.message);
            }
            this.logger.error(`reference insert failed for educator ${educatorId}: ${error?.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la création de la référence.');
        }
        return data;
    }
    async update(profileId, referenceId, dto) {
        const educatorId = await this.resolveEducatorId(profileId);
        const current = await this.loadOwn(educatorId, referenceId);
        if (current.verified) {
            throw new common_1.BadRequestException('Cette référence a déjà été vérifiée et ne peut plus être modifiée.');
        }
        if (dto.testimonial !== undefined) {
            this.validateSpam(dto.testimonial);
        }
        const supabase = this.supabaseService.getServiceClient();
        const updates = {};
        if (dto.full_name !== undefined)
            updates.full_name = dto.full_name.trim();
        if (dto.relationship !== undefined)
            updates.relationship = dto.relationship?.trim() ?? null;
        if (dto.phone !== undefined)
            updates.phone = this.normalizePhoneE164(dto.phone);
        if (dto.email !== undefined)
            updates.email = dto.email?.trim() ?? null;
        if (dto.address !== undefined)
            updates.address = dto.address.trim();
        if (dto.testimonial !== undefined)
            updates.testimonial = dto.testimonial.trim();
        const { data, error } = await supabase
            .from('educator_references')
            .update(updates)
            .eq('id', referenceId)
            .select('*')
            .single();
        if (error || !data) {
            this.logger.error(`reference update failed for ${referenceId}: ${error?.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la mise à jour de la référence.');
        }
        return data;
    }
    async delete(profileId, referenceId) {
        const educatorId = await this.resolveEducatorId(profileId);
        const current = await this.loadOwn(educatorId, referenceId);
        if (current.verified) {
            throw new common_1.BadRequestException('Cette référence a déjà été vérifiée et ne peut plus être supprimée.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase
            .from('educator_references')
            .delete()
            .eq('id', referenceId);
        if (error) {
            this.logger.error(`reference delete failed for ${referenceId}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la suppression de la référence.');
        }
    }
    async listForAdmin(educatorId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_references')
            .select('*')
            .eq('educator_id', educatorId)
            .order('created_at', { ascending: true });
        if (error) {
            this.logger.error(`admin list references failed for educator ${educatorId}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération des références.');
        }
        return (data ?? []);
    }
    async verify(educatorId, referenceId, adminProfileId, notes) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: current, error: fetchError } = await supabase
            .from('educator_references')
            .select('id, educator_id, verified')
            .eq('id', referenceId)
            .maybeSingle();
        if (fetchError) {
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération de la référence.');
        }
        if (!current) {
            throw new common_1.NotFoundException('Référence introuvable.');
        }
        if (current.educator_id !== educatorId) {
            throw new common_1.BadRequestException("Cette référence n'appartient pas à cet éducateur.");
        }
        if (current.verified) {
            throw new common_1.BadRequestException('Cette référence est déjà vérifiée.');
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
            this.logger.error(`reference verify failed for ${referenceId}: ${error?.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la vérification de la référence.');
        }
        return data;
    }
    async canActivate(profileId) {
        await this.resolveEducatorId(profileId);
        return true;
    }
    normalizePhoneE164(raw) {
        const digits = raw.replace(/\D+/g, '');
        if (digits.length === 10)
            return `+1${digits}`;
        if (digits.length === 11 && digits.startsWith('1'))
            return `+${digits}`;
        throw new common_1.BadRequestException('Format de téléphone invalide. Utilisez un numéro canadien (10 chiffres).');
    }
    validateSpam(testimonial) {
        if (URL_REGEX.test(testimonial)) {
            throw new common_1.BadRequestException("Le témoignage ne peut pas contenir d'URL.");
        }
        if (EMAIL_REGEX.test(testimonial)) {
            throw new common_1.BadRequestException("Le témoignage ne peut pas contenir d'adresse courriel.");
        }
    }
    async loadOwn(educatorId, referenceId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_references')
            .select('*')
            .eq('id', referenceId)
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération de la référence.');
        }
        if (!data) {
            throw new common_1.NotFoundException('Référence introuvable.');
        }
        if (data.educator_id !== educatorId) {
            throw new common_1.ForbiddenException("Vous n'êtes pas autorisé à accéder à cette référence.");
        }
        return data;
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
            throw new common_1.InternalServerErrorException('Erreur lors de la vérification du profil.');
        }
        if (!data) {
            throw new common_1.ForbiddenException('Aucun profil éducateur associé à ce compte.');
        }
        return data.id;
    }
};
exports.ReferencesService = ReferencesService;
exports.ReferencesService = ReferencesService = ReferencesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        consents_service_1.ConsentsService])
], ReferencesService);
//# sourceMappingURL=references.service.js.map