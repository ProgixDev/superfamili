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
exports.CreateChildDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateChildDto {
    first_name;
    age_group;
    date_of_birth;
    allergies;
    dietary_restrictions;
    special_needs;
    special_needs_description;
    medical_conditions;
    preferred_activities;
}
exports.CreateChildDto = CreateChildDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Sophie' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le prénom est requis' }),
    __metadata("design:type", String)
], CreateChildDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: [
            'infant_0_12m',
            'toddler_1_3y',
            'preschool_3_5y',
            'kindergarten_5_6y',
            'school_6_12y',
            'teen_12_18y',
        ],
    }),
    (0, class_validator_1.IsEnum)([
        'infant_0_12m',
        'toddler_1_3y',
        'preschool_3_5y',
        'kindergarten_5_6y',
        'school_6_12y',
        'teen_12_18y',
    ], { message: "Groupe d'âge invalide" }),
    __metadata("design:type", String)
], CreateChildDto.prototype, "age_group", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'Format de date invalide' }),
    __metadata("design:type", String)
], CreateChildDto.prototype, "date_of_birth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChildDto.prototype, "allergies", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChildDto.prototype, "dietary_restrictions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateChildDto.prototype, "special_needs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChildDto.prototype, "special_needs_description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChildDto.prototype, "medical_conditions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateChildDto.prototype, "preferred_activities", void 0);
//# sourceMappingURL=create-child.dto.js.map