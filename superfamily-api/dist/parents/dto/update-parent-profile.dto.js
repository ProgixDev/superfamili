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
exports.UpdateParentProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateParentProfileDto {
    number_of_children;
    preferred_educator_gender;
    preferred_service_types;
    max_distance_km;
    budget_min_hourly_cents;
    budget_max_hourly_cents;
    preferred_notification_channel;
}
exports.UpdateParentProfileDto = UpdateParentProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateParentProfileDto.prototype, "number_of_children", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['male', 'female', 'other', 'prefer_not_to_say']),
    __metadata("design:type", String)
], UpdateParentProfileDto.prototype, "preferred_educator_gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpdateParentProfileDto.prototype, "preferred_service_types", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateParentProfileDto.prototype, "max_distance_km", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateParentProfileDto.prototype, "budget_min_hourly_cents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateParentProfileDto.prototype, "budget_max_hourly_cents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['in_app', 'email', 'both'], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['in_app', 'email', 'both']),
    __metadata("design:type", String)
], UpdateParentProfileDto.prototype, "preferred_notification_channel", void 0);
//# sourceMappingURL=update-parent-profile.dto.js.map