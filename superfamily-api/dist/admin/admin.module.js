"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_educators_controller_1 = require("./admin-educators.controller");
const admin_users_service_1 = require("./admin-users.service");
const admin_verifications_service_1 = require("./admin-verifications.service");
const admin_transactions_service_1 = require("./admin-transactions.service");
const admin_disputes_service_1 = require("./admin-disputes.service");
const admin_educators_service_1 = require("./admin-educators.service");
const notifications_module_1 = require("../notifications/notifications.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule],
        controllers: [admin_controller_1.AdminController, admin_educators_controller_1.AdminEducatorsController],
        providers: [
            admin_users_service_1.AdminUsersService,
            admin_verifications_service_1.AdminVerificationsService,
            admin_transactions_service_1.AdminTransactionsService,
            admin_disputes_service_1.AdminDisputesService,
            admin_educators_service_1.AdminEducatorsService,
        ],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map