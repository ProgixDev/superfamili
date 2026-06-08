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
exports.CreateReferenceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateReferenceDto {
    full_name;
    relationship;
    phone;
    email;
    address;
    testimonial;
}
exports.CreateReferenceDto = CreateReferenceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Marie Tremblay', minLength: 2, maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le nom complet est requis.' }),
    (0, class_validator_1.Length)(2, 100, {
        message: 'Le nom doit contenir entre 2 et 100 caractères.',
    }),
    __metadata("design:type", String)
], CreateReferenceDto.prototype, "full_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Nature of the relationship (employer, colleague, family friend, etc.).',
        example: 'Ancien employeur',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 100),
    __metadata("design:type", String)
], CreateReferenceDto.prototype, "relationship", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Canadian phone number. Accepted: +1 XXX XXX XXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX.',
        example: '(514) 555-1234',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le numéro de téléphone est requis.' }),
    (0, class_validator_1.Matches)(/^(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/, {
        message: 'Format de téléphone invalide. Utilisez (XXX) XXX-XXXX ou +1 XXX XXX XXXX.',
    }),
    __metadata("design:type", String)
], CreateReferenceDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'marie.tremblay@example.ca' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Adresse courriel invalide.' }),
    __metadata("design:type", String)
], CreateReferenceDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123 rue Saint-Denis, Montréal, QC H2X 3K8' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: "L'adresse est requise." }),
    (0, class_validator_1.Length)(5, 300),
    __metadata("design:type", String)
], CreateReferenceDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        minLength: 50,
        maxLength: 1000,
        description: 'Testimonial — must not contain URLs or email addresses (anti-spam).',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le témoignage est requis.' }),
    (0, class_validator_1.Length)(50, 1000, {
        message: 'Le témoignage doit contenir entre 50 et 1000 caractères.',
    }),
    __metadata("design:type", String)
], CreateReferenceDto.prototype, "testimonial", void 0);
//# sourceMappingURL=create-reference.dto.js.map