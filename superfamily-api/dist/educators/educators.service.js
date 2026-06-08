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
var EducatorsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EducatorsService = exports.UNLICENSED_CHILD_CAP = exports.LICENSED_CHILD_CAP = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
exports.LICENSED_CHILD_CAP = 15;
exports.UNLICENSED_CHILD_CAP = 5;
const LICENSE_BUCKET = 'licenses';
const LICENSE_MAX_FILE_SIZE = 10 * 1024 * 1024;
const LICENSE_ALLOWED_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
];
function pickLicenseExtension(file) {
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
let EducatorsService = EducatorsService_1 = class EducatorsService {
    supabaseService;
    logger = new common_1.Logger(EducatorsService_1.name);
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getEducatorProfileId(profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_profiles')
            .select('id')
            .eq('profile_id', profileId)
            .single();
        if (error || !data) {
            throw new common_1.ForbiddenException("Profil d'éducateur non trouvé");
        }
        return data.id;
    }
    async geocode(query) {
        const supabase = this.supabaseService.getServiceClient();
        const postalMatch = query
            .toUpperCase()
            .replace(/\s/g, '')
            .match(/^([A-Z]\d[A-Z])(\d[A-Z]\d)?$/);
        if (postalMatch) {
            const fsa = postalMatch[1];
            const { data: exact } = await supabase
                .from('postal_codes')
                .select('postal_code, city, province, latitude, longitude')
                .ilike('postal_code', `${query.toUpperCase().replace(/\s/g, '').slice(0, 3)}%`)
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
            throw new common_1.BadRequestException('Erreur lors du chargement des villes');
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
            throw new common_1.BadRequestException('Erreur lors du chargement des services');
        }
        return data || [];
    }
    async getMyProfile(profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_profiles')
            .select(`*,
        educator_services(*, services(*)),
        educator_availability(*),
        educator_verifications(*)`)
            .eq('profile_id', profileId)
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException("Profil d'éducateur non trouvé");
        }
        return data;
    }
    async getMaxChildrenForEducator(educatorProfileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_profiles')
            .select('license_status')
            .eq('id', educatorProfileId)
            .maybeSingle();
        if (error) {
            this.logger.error(`License lookup failed for educator ${educatorProfileId}: ${error.message}`);
            return exports.UNLICENSED_CHILD_CAP;
        }
        if (!data) {
            return exports.UNLICENSED_CHILD_CAP;
        }
        return data.license_status === 'approved'
            ? exports.LICENSED_CHILD_CAP
            : exports.UNLICENSED_CHILD_CAP;
    }
    async submitLicense(profileId, dto, file) {
        const educatorProfileId = await this.getEducatorProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        if (dto.hasLicense) {
            if (!file) {
                throw new common_1.BadRequestException('Un document de permis est requis lorsque vous déclarez en avoir un.');
            }
            if (file.size > LICENSE_MAX_FILE_SIZE) {
                throw new common_1.BadRequestException('Fichier trop volumineux. Taille maximale : 10 Mo.');
            }
            if (!LICENSE_ALLOWED_MIMES.includes(file.mimetype)) {
                throw new common_1.BadRequestException('Type de fichier non autorisé. Utilisez PDF, JPG, PNG ou WebP.');
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
                this.logger.error(`License storage upload failed for educator ${educatorProfileId}: ${uploadError.message}`);
                throw new common_1.InternalServerErrorException('Erreur lors du téléversement du permis.');
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
                    .catch((err) => this.logger.warn(`Orphaned license cleanup failed (${storageKey}): ${err}`));
                throw new common_1.InternalServerErrorException('Erreur lors de la soumission du permis.');
            }
            return data;
        }
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
            throw new common_1.BadRequestException('Erreur lors de la mise à jour du statut de permis.');
        }
        return data;
    }
    async getPublicProfile(educatorProfileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: educatorProfile, error } = await supabase
            .from('educator_profiles')
            .select(`*,
        profiles!educator_profiles_profile_id_fkey(first_name, last_name, avatar_url, postal_code, gender, bio, is_active, is_verified),
        educator_services(*, services(*)),
        educator_availability(*)`)
            .eq('id', educatorProfileId)
            .single();
        if (error || !educatorProfile) {
            throw new common_1.NotFoundException('Éducateur non trouvé');
        }
        return educatorProfile;
    }
    async getBusyRanges(educatorProfileId, from, to) {
        const supabase = this.supabaseService.getServiceClient();
        if (!from || !to) {
            throw new common_1.BadRequestException('Plage de dates requise');
        }
        const { data, error } = await supabase
            .from('bookings')
            .select('booking_date_start, booking_date_end')
            .eq('educator_profile_id', educatorProfileId)
            .in('status', ['pending_payment', 'confirmed', 'in_progress'])
            .lt('booking_date_start', to)
            .gt('booking_date_end', from);
        if (error) {
            this.logger.error(`Busy-range query failed for educator ${educatorProfileId}: ${error.message}`);
            throw new common_1.BadRequestException('Erreur lors du chargement des créneaux occupés.');
        }
        return (data || []).map((row) => ({
            start: row.booking_date_start,
            end: row.booking_date_end,
        }));
    }
    async updateMyProfile(profileId, dto) {
        const educatorProfileId = await this.getEducatorProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_profiles')
            .update(dto)
            .eq('id', educatorProfileId)
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de la mise à jour du profil d'éducateur");
        }
        return data;
    }
    async addService(profileId, dto) {
        const educatorProfileId = await this.getEducatorProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_services')
            .insert({ ...dto, educator_profile_id: educatorProfileId })
            .select('*, services(*)')
            .single();
        if (error) {
            if (error.code === '23505') {
                throw new common_1.BadRequestException('Ce service est déjà offert');
            }
            throw new common_1.BadRequestException("Erreur lors de l'ajout du service");
        }
        return data;
    }
    async removeService(profileId, serviceId) {
        const educatorProfileId = await this.getEducatorProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase
            .from('educator_services')
            .delete()
            .eq('id', serviceId)
            .eq('educator_profile_id', educatorProfileId);
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la suppression du service');
        }
        return { message: 'Service supprimé avec succès' };
    }
    async setAvailability(profileId, dto) {
        const educatorProfileId = await this.getEducatorProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
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
            throw new common_1.BadRequestException('Erreur lors de la mise à jour des disponibilités');
        }
        return data;
    }
    async addAvailabilityOverride(profileId, dto) {
        const educatorProfileId = await this.getEducatorProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('educator_availability_overrides')
            .insert({ ...dto, educator_profile_id: educatorProfileId })
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de l'ajout de l'exception de disponibilité");
        }
        return data;
    }
    async completeOnboardingStep(profileId, step, data) {
        const educatorProfileId = await this.getEducatorProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
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
        const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : step;
        const updateData = {
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
            throw new common_1.BadRequestException("Erreur lors de la mise à jour de l'étape d'intégration");
        }
        return updated;
    }
};
exports.EducatorsService = EducatorsService;
exports.EducatorsService = EducatorsService = EducatorsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], EducatorsService);
//# sourceMappingURL=educators.service.js.map