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
var DocumentsExpiryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsExpiryService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const documents_service_1 = require("./documents.service");
let DocumentsExpiryService = DocumentsExpiryService_1 = class DocumentsExpiryService {
    documentsService;
    logger = new common_1.Logger(DocumentsExpiryService_1.name);
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    async handleExpirySweep() {
        this.logger.log('Starting educator document expiry sweep');
        const expired = await this.documentsService.findNewlyExpired();
        if (expired.length > 0) {
            await this.documentsService.markExpired(expired.map((r) => r.id));
            for (const row of expired) {
                await this.documentsService.notifyEducatorForDocument(row, 'Document expiré', `Votre ${this.label(row.document_type)} a expiré. Veuillez téléverser une nouvelle version pour continuer à accepter des réservations.`);
            }
            this.logger.log(`Marked ${expired.length} document(s) as expired`);
        }
        const expiringSoon = await this.documentsService.findExpiringSoon();
        for (const row of expiringSoon) {
            const when = row.expires_at
                ? new Date(row.expires_at).toLocaleDateString('fr-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })
                : '';
            await this.documentsService.notifyEducatorForDocument(row, 'Document bientôt expiré', `Votre ${this.label(row.document_type)} expire le ${when}. Veuillez téléverser une nouvelle version.`);
        }
        if (expiringSoon.length > 0) {
            this.logger.log(`Sent expiring-soon warnings for ${expiringSoon.length} document(s)`);
        }
        this.logger.log('Educator document expiry sweep complete');
    }
    label(type) {
        switch (type) {
            case 'background_check':
                return "attestation d'antécédents judiciaires";
            case 'birth_certificate':
                return 'certificat de naissance';
            case 'cpr_certification':
                return 'secourisme petite enfance';
            case 'work_authorization':
                return 'preuve de citoyenneté ou de permis de travail valide';
            case 'secondary_id':
                return "pièce d'identité secondaire";
            case 'diploma':
                return 'diplôme ou attestation de formation';
            default:
                return 'document';
        }
    }
};
exports.DocumentsExpiryService = DocumentsExpiryService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT, {
        timeZone: 'America/Toronto',
        name: 'educator-documents-expiry-sweep',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DocumentsExpiryService.prototype, "handleExpirySweep", null);
exports.DocumentsExpiryService = DocumentsExpiryService = DocumentsExpiryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsExpiryService);
//# sourceMappingURL=documents-expiry.service.js.map