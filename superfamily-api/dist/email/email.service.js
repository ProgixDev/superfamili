"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
const email_templates_1 = require("./email-templates");
let EmailService = EmailService_1 = class EmailService {
    config;
    logger = new common_1.Logger(EmailService_1.name);
    transporter = null;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const host = this.config.get('email.smtp.host');
        const user = this.config.get('email.smtp.user');
        const password = this.config.get('email.smtp.password');
        if (!host || !user || !password) {
            this.logger.warn('SMTP not configured (missing SMTP_HOST / SMTP_USER / SMTP_PASSWORD). Emails will be logged but not sent.');
            return;
        }
        this.transporter = nodemailer.createTransport({
            host,
            port: this.config.get('email.smtp.port') ?? 587,
            secure: this.config.get('email.smtp.secure') ?? false,
            auth: { user, pass: password },
        });
    }
    chrome() {
        return {
            logoUrl: this.config.get('email.logoUrl'),
            homepageUrl: this.config.get('email.homepageUrl'),
            fromName: this.config.get('email.fromName'),
        };
    }
    async send(to, subject, html) {
        const fromName = this.config.get('email.fromName');
        const fromAddress = this.config.get('email.fromAddress');
        const from = `"${fromName}" <${fromAddress}>`;
        if (!this.transporter) {
            this.logger.log(`[DEV] Email suppressed (no SMTP) → to=${to} subject="${subject}"`);
            return;
        }
        try {
            const info = await this.transporter.sendMail({
                from,
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent id=${info.messageId} to=${to} subject="${subject}"`);
        }
        catch (err) {
            this.logger.error(`Failed to send email to=${to} subject="${subject}": ${err.message}`);
            throw err;
        }
    }
    async sendSignupVerification(to, params) {
        const html = (0, email_templates_1.signupVerificationEmail)(this.chrome(), params);
        await this.send(to, `Votre code de vérification ${this.config.get('email.fromName')}`, html);
    }
    async sendPasswordReset(to, params) {
        const html = (0, email_templates_1.passwordResetEmail)(this.chrome(), params);
        await this.send(to, 'Réinitialisation de votre mot de passe', html);
    }
    async sendEmailChangeConfirmation(to, params) {
        const html = (0, email_templates_1.emailChangeEmail)(this.chrome(), params);
        await this.send(to, 'Confirmez votre nouvelle adresse courriel', html);
    }
    async sendEmailChangeNotice(to, params) {
        const html = (0, email_templates_1.emailChangeNoticeEmail)(this.chrome(), params);
        await this.send(to, 'Votre adresse courriel a été modifiée', html);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map