"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const event_emitter_1 = require("@nestjs/event-emitter");
const configuration_1 = __importDefault(require("./config/configuration"));
const supabase_module_1 = require("./supabase/supabase.module");
const auth_module_1 = require("./auth/auth.module");
const profiles_module_1 = require("./profiles/profiles.module");
const parents_module_1 = require("./parents/parents.module");
const educators_module_1 = require("./educators/educators.module");
const bookings_module_1 = require("./bookings/bookings.module");
const payments_module_1 = require("./payments/payments.module");
const reviews_module_1 = require("./reviews/reviews.module");
const messaging_module_1 = require("./messaging/messaging.module");
const notifications_module_1 = require("./notifications/notifications.module");
const admin_module_1 = require("./admin/admin.module");
const tasks_module_1 = require("./tasks/tasks.module");
const kyc_module_1 = require("./kyc/kyc.module");
const documents_module_1 = require("./documents/documents.module");
const references_module_1 = require("./references/references.module");
const consents_module_1 = require("./consents/consents.module");
const onboarding_module_1 = require("./onboarding/onboarding.module");
const supabase_auth_guard_1 = require("./common/guards/supabase-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            event_emitter_1.EventEmitterModule.forRoot(),
            supabase_module_1.SupabaseModule,
            auth_module_1.AuthModule,
            profiles_module_1.ProfilesModule,
            parents_module_1.ParentsModule,
            educators_module_1.EducatorsModule,
            bookings_module_1.BookingsModule,
            payments_module_1.PaymentsModule,
            reviews_module_1.ReviewsModule,
            messaging_module_1.MessagingModule,
            notifications_module_1.NotificationsModule,
            admin_module_1.AdminModule,
            tasks_module_1.TasksModule,
            kyc_module_1.KycModule,
            documents_module_1.DocumentsModule,
            references_module_1.ReferencesModule,
            consents_module_1.ConsentsModule,
            onboarding_module_1.OnboardingModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: supabase_auth_guard_1.SupabaseAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map