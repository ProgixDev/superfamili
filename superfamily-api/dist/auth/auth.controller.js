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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const signup_dto_1 = require("./dto/signup.dto");
const send_verification_otp_dto_1 = require("./dto/send-verification-otp.dto");
const verify_email_dto_1 = require("./dto/verify-email.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const request_email_change_dto_1 = require("./dto/request-email-change.dto");
const confirm_email_change_dto_1 = require("./dto/confirm-email-change.dto");
const signup_init_dto_1 = require("./dto/signup-init.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const allow_no_profile_decorator_1 = require("../common/decorators/allow-no-profile.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async signup(user, dto) {
        return this.authService.signup(user.userId, user.email, dto);
    }
    async getMe(user) {
        return this.authService.getMe(user.userId);
    }
    async signupInit(dto) {
        return this.authService.signupInit({
            email: dto.email,
            password: dto.password,
            first_name: dto.first_name,
            last_name: dto.last_name,
        });
    }
    async sendVerificationOtp(dto) {
        return this.authService.sendSignupVerification(dto.email, dto.first_name);
    }
    async verifyEmail(dto) {
        return this.authService.verifyEmail(dto.email, dto.code);
    }
    async forgotPassword(dto) {
        return this.authService.forgotPassword(dto.email);
    }
    async resetPassword(dto) {
        return this.authService.resetPassword(dto.email, dto.code, dto.new_password);
    }
    async requestEmailChange(user, dto) {
        return this.authService.requestEmailChange(user.userId, user.email, dto.new_email);
    }
    async confirmEmailChange(user, dto) {
        return this.authService.confirmEmailChange(user.userId, dto.new_email, dto.code);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('signup'),
    (0, allow_no_profile_decorator_1.AllowNoProfile)(),
    (0, swagger_1.ApiOperation)({ summary: "Créer un profil pour l'utilisateur authentifié" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, signup_dto_1.SignupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: "Obtenir le profil de l'utilisateur connecté" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('signup-init'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Créer un compte Supabase non confirmé et envoyer un code de vérification',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_init_dto_1.SignupInitDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signupInit", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('send-verification-otp'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: "Envoyer un code de vérification à l'adresse courriel",
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_verification_otp_dto_1.SendVerificationOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendVerificationOtp", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: "Vérifier le code et confirmer l'adresse courriel",
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_email_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Demander la réinitialisation du mot de passe' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Réinitialiser le mot de passe avec un code OTP' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('request-email-change'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: "Demander le changement d'adresse courriel" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, request_email_change_dto_1.RequestEmailChangeDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestEmailChange", null);
__decorate([
    (0, common_1.Post)('confirm-email-change'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: "Confirmer le changement d'adresse courriel" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, confirm_email_change_dto_1.ConfirmEmailChangeDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmEmailChange", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map