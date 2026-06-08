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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EducatorsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const educators_service_1 = require("./educators.service");
const educators_search_service_1 = require("./educators-search.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const update_educator_profile_dto_1 = require("./dto/update-educator-profile.dto");
const create_educator_service_dto_1 = require("./dto/create-educator-service.dto");
const set_availability_dto_1 = require("./dto/set-availability.dto");
const search_educators_dto_1 = require("./dto/search-educators.dto");
const onboarding_step_dto_1 = require("./dto/onboarding-step.dto");
const update_license_dto_1 = require("./dto/update-license.dto");
let EducatorsController = class EducatorsController {
    educatorsService;
    searchService;
    constructor(educatorsService, searchService) {
        this.educatorsService = educatorsService;
        this.searchService = searchService;
    }
    async getCities() {
        return this.educatorsService.getCities();
    }
    async geocode(query) {
        if (!query || query.length < 2) {
            throw new common_1.BadRequestException('Requête trop courte');
        }
        return this.educatorsService.geocode(query);
    }
    async autocompleteCities(query, limit) {
        if (!query || query.length < 2)
            return [];
        return this.searchService.autocompleteCities(query, limit ? parseInt(limit) : 10);
    }
    async getServicesCatalog() {
        return this.educatorsService.getServicesCatalog();
    }
    async search(dto) {
        return this.searchService.search(dto);
    }
    async getMyProfile(user) {
        return this.educatorsService.getMyProfile(user.profileId);
    }
    async getPublicProfile(id) {
        return this.educatorsService.getPublicProfile(id);
    }
    async getBusyRanges(id, from, to) {
        if (!from || !to) {
            throw new common_1.BadRequestException('`from` et `to` sont requis (format ISO).');
        }
        const fromMs = Date.parse(from);
        const toMs = Date.parse(to);
        if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) {
            throw new common_1.BadRequestException('Plage `from`/`to` invalide.');
        }
        if (toMs - fromMs > 1000 * 60 * 60 * 24 * 45) {
            throw new common_1.BadRequestException('Plage trop large (max 45 jours).');
        }
        return this.educatorsService.getBusyRanges(id, from, to);
    }
    async updateMyProfile(user, dto) {
        return this.educatorsService.updateMyProfile(user.profileId, dto);
    }
    async addService(user, dto) {
        return this.educatorsService.addService(user.profileId, dto);
    }
    async removeService(user, serviceId) {
        return this.educatorsService.removeService(user.profileId, serviceId);
    }
    async setAvailability(user, dto) {
        return this.educatorsService.setAvailability(user.profileId, dto);
    }
    async addAvailabilityOverride(user, dto) {
        return this.educatorsService.addAvailabilityOverride(user.profileId, dto);
    }
    async completeOnboarding(user, step, dto) {
        return this.educatorsService.completeOnboardingStep(user.profileId, step, dto.data);
    }
    async submitLicense(user, dto, file) {
        return this.educatorsService.submitLicense(user.profileId, dto, file);
    }
};
exports.EducatorsController = EducatorsController;
__decorate([
    (0, common_1.Get)('cities'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lister toutes les villes canadiennes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "getCities", null);
__decorate([
    (0, common_1.Get)('geocode'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Géocoder une adresse ou code postal' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "geocode", null);
__decorate([
    (0, common_1.Get)('cities/autocomplete'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Autocompléter les villes' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "autocompleteCities", null);
__decorate([
    (0, common_1.Get)('services-catalog'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lister le catalogue de services disponibles' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "getServicesCatalog", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Rechercher des éducateurs' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_educators_dto_1.SearchEducatorsDto]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: "Obtenir mon profil d'éducateur" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: "Obtenir le profil public d'un éducateur" }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "getPublicProfile", null);
__decorate([
    (0, common_1.Get)(':id/busy'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({
        summary: "Lister les plages occupées d'un éducateur (sans PII)",
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "getBusyRanges", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour mon profil' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_educator_profile_dto_1.UpdateEducatorProfileDto]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Post)('me/services'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: 'Ajouter un service offert' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_educator_service_dto_1.CreateEducatorServiceDto]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "addService", null);
__decorate([
    (0, common_1.Delete)('me/services/:id'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: 'Supprimer un service' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "removeService", null);
__decorate([
    (0, common_1.Put)('me/availability'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: 'Définir les disponibilités hebdomadaires' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, set_availability_dto_1.SetAvailabilityDto]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "setAvailability", null);
__decorate([
    (0, common_1.Post)('me/availability/overrides'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: 'Ajouter une exception de disponibilité' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, set_availability_dto_1.CreateAvailabilityOverrideDto]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "addAvailabilityOverride", null);
__decorate([
    (0, common_1.Post)('me/onboarding/:step'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: "Compléter une étape d'intégration" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('step')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, onboarding_step_dto_1.OnboardingStepDto]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "completeOnboarding", null);
__decorate([
    (0, common_1.Post)('me/license'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    (0, swagger_1.ApiOperation)({
        summary: 'Soumettre un permis gouvernemental pour révision (ou déclarer ne pas en avoir)',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['hasLicense'],
            properties: {
                hasLicense: { type: 'boolean' },
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_license_dto_1.UpdateLicenseDto, Object]),
    __metadata("design:returntype", Promise)
], EducatorsController.prototype, "submitLicense", null);
exports.EducatorsController = EducatorsController = __decorate([
    (0, swagger_1.ApiTags)('Educators'),
    (0, common_1.Controller)('educators'),
    __metadata("design:paramtypes", [educators_service_1.EducatorsService,
        educators_search_service_1.EducatorsSearchService])
], EducatorsController);
//# sourceMappingURL=educators.controller.js.map