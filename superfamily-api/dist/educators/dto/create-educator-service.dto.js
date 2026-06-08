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
exports.CreateEducatorServiceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateEducatorServiceDto {
    service_id;
    hourly_rate_cents;
    minimum_booking_hours;
    can_provide_on_weekends;
    can_provide_overnight;
    requires_parent_presence;
}
exports.CreateEducatorServiceDto = CreateEducatorServiceDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)('4', { message: 'ID de service invalide' }),
    __metadata("design:type", String)
], CreateEducatorServiceDto.prototype, "service_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Taux horaire en cents CAD', example: 2500 }),
    (0, class_validator_1.IsInt)({ message: 'Le taux horaire doit être un nombre entier (en cents)' }),
    (0, class_validator_1.Min)(1, { message: 'Le taux horaire doit être positif' }),
    __metadata("design:type", Number)
], CreateEducatorServiceDto.prototype, "hourly_rate_cents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.5),
    __metadata("design:type", Number)
], CreateEducatorServiceDto.prototype, "minimum_booking_hours", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEducatorServiceDto.prototype, "can_provide_on_weekends", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEducatorServiceDto.prototype, "can_provide_overnight", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEducatorServiceDto.prototype, "requires_parent_presence", void 0);
//# sourceMappingURL=create-educator-service.dto.js.map