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
exports.ParentsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let ParentsService = class ParentsService {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getParentProfileId(profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('parent_profiles')
            .select('id')
            .eq('profile_id', profileId)
            .single();
        if (error || !data) {
            throw new common_1.ForbiddenException('Profil parent non trouvé');
        }
        return data.id;
    }
    async getMyProfile(profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('parent_profiles')
            .select('*, children(*)')
            .eq('profile_id', profileId)
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException('Profil parent non trouvé');
        }
        return data;
    }
    async updateMyProfile(profileId, dto) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('parent_profiles')
            .update(dto)
            .eq('profile_id', profileId)
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la mise à jour du profil parent');
        }
        return data;
    }
    async addChild(profileId, dto) {
        const parentProfileId = await this.getParentProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('children')
            .insert({ ...dto, parent_profile_id: parentProfileId })
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de l'ajout de l'enfant");
        }
        return data;
    }
    async updateChild(profileId, childId, dto) {
        const parentProfileId = await this.getParentProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('children')
            .update(dto)
            .eq('id', childId)
            .eq('parent_profile_id', parentProfileId)
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de la mise à jour de l'enfant");
        }
        return data;
    }
    async removeChild(profileId, childId) {
        const parentProfileId = await this.getParentProfileId(profileId);
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase
            .from('children')
            .update({ is_active: false })
            .eq('id', childId)
            .eq('parent_profile_id', parentProfileId);
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de la suppression de l'enfant");
        }
        return { message: 'Enfant supprimé avec succès' };
    }
};
exports.ParentsService = ParentsService;
exports.ParentsService = ParentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ParentsService);
//# sourceMappingURL=parents.service.js.map