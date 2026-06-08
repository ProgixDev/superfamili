"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateReferenceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_reference_dto_1 = require("./create-reference.dto");
class UpdateReferenceDto extends (0, swagger_1.PartialType)(create_reference_dto_1.CreateReferenceDto) {
}
exports.UpdateReferenceDto = UpdateReferenceDto;
//# sourceMappingURL=update-reference.dto.js.map