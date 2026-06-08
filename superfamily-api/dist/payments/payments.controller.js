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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payments_service_1 = require("./payments.service");
const payouts_service_1 = require("./payouts.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const create_payment_intent_dto_1 = require("./dto/create-payment-intent.dto");
let PaymentsController = class PaymentsController {
    paymentsService;
    payoutsService;
    constructor(paymentsService, payoutsService) {
        this.paymentsService = paymentsService;
        this.payoutsService = payoutsService;
    }
    async createPaymentIntent(user, dto) {
        return this.paymentsService.createPaymentIntent(dto.booking_id, user.profileId);
    }
    async handleWebhook(rawBody, signature) {
        return this.paymentsService.handleWebhook(rawBody, signature);
    }
    async createConnectAccount(user) {
        return this.paymentsService.createConnectAccount(user.profileId);
    }
    async getConnectStatus(user) {
        return this.paymentsService.getConnectStatus(user.profileId);
    }
    async getPayouts(user, page, limit) {
        return this.payoutsService.getEducatorPayouts(user.profileId, page || 1, limit || 20);
    }
    async getAnnualReport(user, year) {
        return this.payoutsService.getAnnualReport(user.profileId, year);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('create-intent'),
    (0, roles_decorator_1.Roles)('parent'),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un PaymentIntent Stripe' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_payment_intent_dto_1.CreatePaymentIntentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createPaymentIntent", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook Stripe' }),
    __param(0, (0, common_1.RawBody)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Buffer, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('stripe/connect-account'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un compte Stripe Connect' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createConnectAccount", null);
__decorate([
    (0, common_1.Get)('stripe/connect-status'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: 'Vérifier le statut Stripe Connect' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getConnectStatus", null);
__decorate([
    (0, common_1.Get)('payouts'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: 'Lister mes paiements reçus' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPayouts", null);
__decorate([
    (0, common_1.Get)('annual-report/:year'),
    (0, roles_decorator_1.Roles)('educator'),
    (0, swagger_1.ApiOperation)({ summary: "Rapport annuel de revenus pour l'educateur" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getAnnualReport", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        payouts_service_1.PayoutsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map