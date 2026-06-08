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
exports.ParentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const parents_service_1 = require("./parents.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const create_child_dto_1 = require("./dto/create-child.dto");
const update_parent_profile_dto_1 = require("./dto/update-parent-profile.dto");
let ParentsController = class ParentsController {
    parentsService;
    constructor(parentsService) {
        this.parentsService = parentsService;
    }
    async getMyProfile(user) {
        return this.parentsService.getMyProfile(user.profileId);
    }
    async updateMyProfile(user, dto) {
        return this.parentsService.updateMyProfile(user.profileId, dto);
    }
    async addChild(user, dto) {
        return this.parentsService.addChild(user.profileId, dto);
    }
    async updateChild(user, childId, dto) {
        return this.parentsService.updateChild(user.profileId, childId, dto);
    }
    async removeChild(user, childId) {
        return this.parentsService.removeChild(user.profileId, childId);
    }
};
exports.ParentsController = ParentsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtenir mon profil parent' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour mon profil parent' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_parent_profile_dto_1.UpdateParentProfileDto]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Post)('children'),
    (0, swagger_1.ApiOperation)({ summary: 'Ajouter un enfant' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_child_dto_1.CreateChildDto]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "addChild", null);
__decorate([
    (0, common_1.Patch)('children/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour un enfant' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "updateChild", null);
__decorate([
    (0, common_1.Delete)('children/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Supprimer un enfant' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ParentsController.prototype, "removeChild", null);
exports.ParentsController = ParentsController = __decorate([
    (0, swagger_1.ApiTags)('Parents'),
    (0, common_1.Controller)('parents'),
    (0, roles_decorator_1.Roles)('parent'),
    __metadata("design:paramtypes", [parents_service_1.ParentsService])
], ParentsController);
//# sourceMappingURL=parents.controller.js.map