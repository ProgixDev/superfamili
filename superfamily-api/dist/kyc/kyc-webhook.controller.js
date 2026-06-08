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
var KycWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const kyc_service_1 = require("./kyc.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
let KycWebhookController = KycWebhookController_1 = class KycWebhookController {
    kycService;
    logger = new common_1.Logger(KycWebhookController_1.name);
    constructor(kycService) {
        this.kycService = kycService;
    }
    async handleDiditWebhook(req, headers) {
        const rawBody = req.rawBody;
        if (!rawBody || rawBody.length === 0) {
            this.logger.warn('Didit webhook received with empty body');
            throw new common_1.UnauthorizedException('Empty webhook body.');
        }
        try {
            await this.kycService.handleWebhook(rawBody, headers);
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException)
                throw err;
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Didit webhook processing error (swallowed, returning 200): ${message}`, err instanceof Error ? err.stack : undefined);
        }
        return { received: true };
    }
};
exports.KycWebhookController = KycWebhookController;
__decorate([
    (0, common_1.Post)('webhook'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], KycWebhookController.prototype, "handleDiditWebhook", null);
exports.KycWebhookController = KycWebhookController = KycWebhookController_1 = __decorate([
    (0, common_1.Controller)('kyc'),
    __metadata("design:paramtypes", [kyc_service_1.KycService])
], KycWebhookController);
//# sourceMappingURL=kyc-webhook.controller.js.map