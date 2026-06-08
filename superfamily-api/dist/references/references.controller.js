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
exports.ReferencesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const references_service_1 = require("./references.service");
const create_reference_dto_1 = require("./dto/create-reference.dto");
const update_reference_dto_1 = require("./dto/update-reference.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let ReferencesController = class ReferencesController {
    referencesService;
    constructor(referencesService) {
        this.referencesService = referencesService;
    }
    async list(user) {
        return this.referencesService.listForEducator(user.profileId);
    }
    async create(user, dto) {
        return this.referencesService.create(user.profileId, dto);
    }
    async update(user, id, dto) {
        return this.referencesService.update(user.profileId, id, dto);
    }
    async delete(user, id) {
        await this.referencesService.delete(user.profileId, id);
    }
    async canActivate(user) {
        const ok = await this.referencesService.canActivate(user.profileId);
        return { can_activate: ok };
    }
};
exports.ReferencesController = ReferencesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lister mes références' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferencesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Créer une nouvelle référence' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_reference_dto_1.CreateReferenceDto]),
    __metadata("design:returntype", Promise)
], ReferencesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mettre à jour une référence (uniquement si non vérifiée)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_reference_dto_1.UpdateReferenceDto]),
    __metadata("design:returntype", Promise)
], ReferencesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Supprimer une référence (uniquement si non vérifiée)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReferencesController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)('can-activate/status'),
    (0, swagger_1.ApiOperation)({
        summary: "Retourne whether les références bloquent l'activation du compte",
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferencesController.prototype, "canActivate", null);
exports.ReferencesController = ReferencesController = __decorate([
    (0, swagger_1.ApiTags)('Educator References'),
    (0, common_1.Controller)('educators/me/references'),
    (0, roles_decorator_1.Roles)('educator'),
    __metadata("design:paramtypes", [references_service_1.ReferencesService])
], ReferencesController);
//# sourceMappingURL=references.controller.js.map