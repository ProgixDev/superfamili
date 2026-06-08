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
exports.ReferencesAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const references_service_1 = require("./references.service");
const verify_reference_dto_1 = require("./dto/verify-reference.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let ReferencesAdminController = class ReferencesAdminController {
    referencesService;
    constructor(referencesService) {
        this.referencesService = referencesService;
    }
    async list(educatorId) {
        return this.referencesService.listForAdmin(educatorId);
    }
    async verify(user, educatorId, refId, dto) {
        return this.referencesService.verify(educatorId, refId, user.profileId, dto.notes);
    }
};
exports.ReferencesAdminController = ReferencesAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lister les références d’un éducateur' }),
    __param(0, (0, common_1.Param)('educatorId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReferencesAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':refId/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Marquer une référence comme vérifiée' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('educatorId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('refId', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, verify_reference_dto_1.VerifyReferenceDto]),
    __metadata("design:returntype", Promise)
], ReferencesAdminController.prototype, "verify", null);
exports.ReferencesAdminController = ReferencesAdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin — References'),
    (0, common_1.Controller)('admin/educators/:educatorId/references'),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [references_service_1.ReferencesService])
], ReferencesAdminController);
//# sourceMappingURL=references-admin.controller.js.map