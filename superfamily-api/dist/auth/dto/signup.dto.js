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
exports.SignupDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class SignupDto {
    first_name;
    last_name;
    role;
    postal_code;
    city;
    phone;
}
exports.SignupDto = SignupDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Jean' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le prénom est requis' }),
    __metadata("design:type", String)
], SignupDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dupont' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le nom est requis' }),
    __metadata("design:type", String)
], SignupDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['parent', 'educator', 'admin'] }),
    (0, class_validator_1.IsEnum)(['parent', 'educator', 'admin'], {
        message: 'Le rôle doit être parent, educator ou admin',
    }),
    __metadata("design:type", String)
], SignupDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'H2X 1Y4', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]$/, {
        message: 'Format de code postal invalide (ex: H2X 1Y4)',
    }),
    __metadata("design:type", String)
], SignupDto.prototype, "postal_code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Montréal', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SignupDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '514-555-1234', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SignupDto.prototype, "phone", void 0);
//# sourceMappingURL=signup.dto.js.map