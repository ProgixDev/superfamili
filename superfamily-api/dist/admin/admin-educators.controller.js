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
exports.AdminEducatorsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const admin_educators_service_1 = require("./admin-educators.service");
const review_license_dto_1 = require("./dto/review-license.dto");
let AdminEducatorsController = class AdminEducatorsController {
    adminEducatorsService;
    constructor(adminEducatorsService) {
        this.adminEducatorsService = adminEducatorsService;
    }
    async listPendingLicenses(page, limit) {
        return this.adminEducatorsService.listPendingLicenses(page || 1, limit || 20);
    }
    async listEducators(page, limit, search) {
        return this.adminEducatorsService.listEducators(page ? Number(page) : 1, limit ? Number(limit) : 20, search);
    }
    async reviewLicense(user, educatorProfileId, dto) {
        if (dto.action === 'approve') {
            return this.adminEducatorsService.approveLicense(educatorProfileId, user.profileId);
        }
        return this.adminEducatorsService.rejectLicense(educatorProfileId, user.profileId, dto.reason || '');
    }
};
exports.AdminEducatorsController = AdminEducatorsController;
__decorate([
    (0, common_1.Get)('licenses/pending'),
    (0, swagger_1.ApiOperation)({
        summary: 'Lister les permis gouvernementaux en attente de révision',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], AdminEducatorsController.prototype, "listPendingLicenses", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lister tous les éducateurs' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], AdminEducatorsController.prototype, "listEducators", null);
__decorate([
    (0, common_1.Patch)('licenses/:educatorProfileId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Approuver ou rejeter un permis gouvernemental',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('educatorProfileId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_license_dto_1.ReviewLicenseDto]),
    __metadata("design:returntype", Promise)
], AdminEducatorsController.prototype, "reviewLicense", null);
exports.AdminEducatorsController = AdminEducatorsController = __decorate([
    (0, swagger_1.ApiTags)('Admin — Educators'),
    (0, common_1.Controller)('admin/educators'),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [admin_educators_service_1.AdminEducatorsService])
], AdminEducatorsController);
//# sourceMappingURL=admin-educators.controller.js.map