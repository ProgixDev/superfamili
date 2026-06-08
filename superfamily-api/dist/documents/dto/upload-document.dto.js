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
exports.UploadDocumentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UploadDocumentDto {
    type;
    issued_date;
}
exports.UploadDocumentDto = UploadDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: [
            'background_check',
            'birth_certificate',
            'cpr_certification',
            'work_authorization',
            'secondary_id',
            'diploma',
        ],
        description: 'Type of document being uploaded.',
    }),
    (0, class_validator_1.IsEnum)([
        'background_check',
        'birth_certificate',
        'cpr_certification',
        'work_authorization',
        'secondary_id',
        'diploma',
    ], {
        message: 'Type de document invalide. Valeurs acceptées : background_check, birth_certificate, cpr_certification, work_authorization, secondary_id, diploma.',
    }),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Issue date of the document (YYYY-MM-DD). Used to compute expires_at. Required for background_check and cpr_certification.',
        example: '2026-02-15',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: "La date d'émission doit être au format YYYY-MM-DD." }),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "issued_date", void 0);
//# sourceMappingURL=upload-document.dto.js.map