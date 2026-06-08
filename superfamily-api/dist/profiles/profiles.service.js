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
var ProfilesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilesService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const PROFILE_PHOTOS_BUCKET = 'profile-photos';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
let ProfilesService = ProfilesService_1 = class ProfilesService {
    supabaseService;
    logger = new common_1.Logger(ProfilesService_1.name);
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getMyProfile(userId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error || !profile) {
            throw new common_1.BadRequestException('Profil non trouvé');
        }
        let roleProfile = null;
        if (profile.role === 'parent') {
            const { data } = await supabase
                .from('parent_profiles')
                .select('*, children(*)')
                .eq('profile_id', profile.id)
                .single();
            roleProfile = data;
        }
        else if (profile.role === 'educator') {
            const { data } = await supabase
                .from('educator_profiles')
                .select('*, educator_services(*, services(*)), educator_availability(*)')
                .eq('profile_id', profile.id)
                .single();
            roleProfile = data;
        }
        return { ...profile, role_profile: roleProfile };
    }
    async updateMyProfile(userId, dto) {
        const supabase = this.supabaseService.getServiceClient();
        const updateData = { ...dto };
        if (dto.latitude != null && dto.longitude != null) {
            updateData.location_point = `POINT(${dto.longitude} ${dto.latitude})`;
        }
        if (dto.postal_code && dto.latitude == null) {
            const { data: postalData } = await supabase
                .from('postal_codes')
                .select('latitude, longitude, city')
                .eq('postal_code', dto.postal_code)
                .single();
            if (postalData) {
                updateData.latitude = postalData.latitude;
                updateData.longitude = postalData.longitude;
                updateData.location_point = `POINT(${postalData.longitude} ${postalData.latitude})`;
                if (!updateData.city)
                    updateData.city = postalData.city;
            }
        }
        else if (dto.city && !dto.postal_code && dto.latitude == null) {
            const { data: cityData } = await supabase
                .from('cities')
                .select('latitude, longitude, name')
                .ilike('name', dto.city)
                .limit(1)
                .single();
            if (cityData) {
                updateData.latitude = cityData.latitude;
                updateData.longitude = cityData.longitude;
                updateData.location_point = `POINT(${cityData.longitude} ${cityData.latitude})`;
                updateData.city = cityData.name;
            }
        }
        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', userId)
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la mise à jour du profil');
        }
        return data;
    }
    async uploadAvatar(userId, file) {
        if (!file) {
            throw new common_1.BadRequestException('Aucun fichier fourni.');
        }
        if (file.size > MAX_AVATAR_BYTES) {
            throw new common_1.BadRequestException('Photo trop volumineuse. Taille maximale : 5 Mo.');
        }
        if (!ALLOWED_AVATAR_MIMES.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .single();
        if (profileError || !profile) {
            throw new common_1.BadRequestException('Profil non trouvé');
        }
        const extension = this.avatarExtension(file.mimetype);
        const storageKey = `${profile.id}/${(0, crypto_1.randomUUID)()}${extension}`;
        console.log(`[ProfilesService] Uploading avatar for profile ${profile.id} to storage...`);
        const { error: uploadError } = await supabase.storage
            .from(PROFILE_PHOTOS_BUCKET)
            .upload(storageKey, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });
        if (uploadError) {
            console.error(`[ProfilesService] Storage upload failed:`, uploadError);
            throw new common_1.InternalServerErrorException("Erreur lors du téléversement de l'image.");
        }
        const { data: publicUrlData } = supabase.storage
            .from(PROFILE_PHOTOS_BUCKET)
            .getPublicUrl(storageKey);
        console.log(`[ProfilesService] Updating profiles table with URL: ${publicUrlData.publicUrl}`);
        const { data, error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrlData.publicUrl })
            .eq('id', profile.id)
            .select()
            .single();
        if (updateError || !data) {
            console.error(`[ProfilesService] Profiles table update failed:`, updateError);
            await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([storageKey]);
            throw new common_1.InternalServerErrorException("Erreur lors de l'enregistrement de la photo dans le profil.");
        }
        console.log(`[ProfilesService] Avatar successfully updated for profile ${profile.id}`);
        return data;
    }
    avatarExtension(mimeType) {
        switch (mimeType) {
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
};
exports.ProfilesService = ProfilesService;
exports.ProfilesService = ProfilesService = ProfilesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ProfilesService);
//# sourceMappingURL=profiles.service.js.map