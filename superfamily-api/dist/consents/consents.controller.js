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
exports.ConsentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const consents_service_1 = require("./consents.service");
const accept_consent_dto_1 = require("./dto/accept-consent.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
let ConsentsController = class ConsentsController {
    consentsService;
    constructor(consentsService) {
        this.consentsService = consentsService;
    }
    async required(user) {
        return this.consentsService.getRequired(user.profileId, user.role);
    }
    async accept(user, dto, req) {
        const context = this.extractRequestContext(req);
        await this.consentsService.accept(user.profileId, dto, context);
        return { success: true };
    }
    async history(user) {
        return this.consentsService.getHistory(user.profileId);
    }
    async revoke(user, type, req) {
        if (!accept_consent_dto_1.CONSENT_TYPES.includes(type)) {
            throw new common_1.BadRequestException('Type de consentement invalide.');
        }
        const context = this.extractRequestContext(req);
        await this.consentsService.revoke(user.profileId, type, context);
        return { success: true };
    }
    async policy(type, version) {
        if (!accept_consent_dto_1.CONSENT_TYPES.includes(type)) {
            throw new common_1.BadRequestException('Type de consentement invalide.');
        }
        return this.consentsService.getPolicyContent(type, version);
    }
    extractRequestContext(req) {
        const xff = req.headers['x-forwarded-for'];
        let ip = null;
        if (typeof xff === 'string' && xff.length > 0) {
            ip = xff.split(',')[0].trim();
        }
        else if (Array.isArray(xff) && xff.length > 0) {
            ip = xff[0];
        }
        else if (req.ip) {
            ip = req.ip;
        }
        const ua = req.headers['user-agent'];
        const userAgent = typeof ua === 'string' ? ua.slice(0, 1000) : null;
        return { ip, userAgent };
    }
};
exports.ConsentsController = ConsentsController;
__decorate([
    (0, common_1.Get)('required'),
    (0, swagger_1.ApiOperation)({
        summary: "Liste des consentements applicables à l'utilisateur authentifié",
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConsentsController.prototype, "required", null);
__decorate([
    (0, common_1.Post)('accept'),
    (0, swagger_1.ApiOperation)({ summary: 'Enregistrer une décision de consentement' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, accept_consent_dto_1.AcceptConsentDto, Object]),
    __metadata("design:returntype", Promise)
], ConsentsController.prototype, "accept", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({
        summary: "Historique complet des consentements de l'utilisateur",
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConsentsController.prototype, "history", null);
__decorate([
    (0, common_1.Delete)(':type'),
    (0, swagger_1.ApiOperation)({ summary: 'Révoquer un consentement' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ConsentsController.prototype, "revoke", null);
__decorate([
    (0, common_1.Get)('policy'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: "Contenu Markdown d'une version de politique" }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: true, enum: accept_consent_dto_1.CONSENT_TYPES }),
    (0, swagger_1.ApiQuery)({ name: 'version', required: false }),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ConsentsController.prototype, "policy", null);
exports.ConsentsController = ConsentsController = __decorate([
    (0, swagger_1.ApiTags)('Consents'),
    (0, common_1.Controller)('consents'),
    __metadata("design:paramtypes", [consents_service_1.ConsentsService])
], ConsentsController);
//# sourceMappingURL=consents.controller.js.map