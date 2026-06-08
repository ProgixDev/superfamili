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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
let StripeService = StripeService_1 = class StripeService {
    configService;
    stripe;
    logger = new common_1.Logger(StripeService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        const secretKey = this.configService.get('stripe.secretKey');
        if (!secretKey || secretKey === 'sk_test_placeholder') {
            this.logger.warn('Stripe secret key not configured — Stripe calls will fail');
        }
        this.stripe = new stripe_1.default(secretKey, {
            typescript: true,
        });
    }
    async createExpressAccount(email, name) {
        return this.stripe.accounts.create({
            type: 'express',
            country: 'CA',
            email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
            business_profile: {
                mcc: '8299',
                product_description: 'Services de garde éducatifs pour enfants — SuperFamily',
            },
            metadata: {
                platform: 'superfamily',
                educator_name: name,
            },
        });
    }
    async createAccountLink(accountId, refreshUrl, returnUrl) {
        return this.stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });
    }
    async getAccount(accountId) {
        return this.stripe.accounts.retrieve(accountId);
    }
    async createCustomer(email, name, metadata) {
        return this.stripe.customers.create({
            email,
            name,
            metadata: { platform: 'superfamily', ...metadata },
        });
    }
    async createPaymentIntent(params) {
        return this.stripe.paymentIntents.create({
            amount: params.amountCents,
            currency: 'cad',
            customer: params.customerStripeId,
            transfer_data: {
                destination: params.educatorStripeAccountId,
            },
            application_fee_amount: params.applicationFeeAmountCents,
            metadata: params.metadata,
            automatic_payment_methods: { enabled: true },
        });
    }
    async retrievePaymentIntent(paymentIntentId) {
        try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
        }
        catch {
            return null;
        }
    }
    async createRefund(paymentIntentId, amountCents) {
        const params = {
            payment_intent: paymentIntentId,
            reverse_transfer: true,
            refund_application_fee: true,
        };
        if (amountCents) {
            params.amount = amountCents;
        }
        return this.stripe.refunds.create(params);
    }
    constructWebhookEvent(payload, signature, secret) {
        return this.stripe.webhooks.constructEvent(payload, signature, secret);
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map