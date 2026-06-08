"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowNoProfile = exports.ALLOW_NO_PROFILE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ALLOW_NO_PROFILE_KEY = 'allowNoProfile';
const AllowNoProfile = () => (0, common_1.SetMetadata)(exports.ALLOW_NO_PROFILE_KEY, true);
exports.AllowNoProfile = AllowNoProfile;
//# sourceMappingURL=allow-no-profile.decorator.js.map