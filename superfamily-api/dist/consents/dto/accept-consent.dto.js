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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptConsentDto = exports.CONSENT_TYPES = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
exports.CONSENT_TYPES = [
    'terms_of_use',
    'privacy_policy',
    'kyc_verification',
    'reference_contact',
    'background_check_storage',
    'marketing_emails',
];
class AcceptConsentDto {
    consent_type;
    version;
    accepted;
}
exports.AcceptConsentDto = AcceptConsentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.CONSENT_TYPES }),
    (0, class_validator_1.IsEnum)(exports.CONSENT_TYPES, { message: 'Type de consentement invalide.' }),
    __metadata("design:type", String)
], AcceptConsentDto.prototype, "consent_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Version of the policy being accepted (e.g., "2026-04-11").',
        example: '2026-04-11',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'La version de la politique est requise.' }),
    __metadata("design:type", String)
], AcceptConsentDto.prototype, "version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether the user accepted or declined. Must be true for required consents.',
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AcceptConsentDto.prototype, "accepted", void 0);
//# sourceMappingURL=accept-consent.dto.js.map