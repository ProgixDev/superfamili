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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const admin_users_service_1 = require("./admin-users.service");
const admin_verifications_service_1 = require("./admin-verifications.service");
const admin_transactions_service_1 = require("./admin-transactions.service");
const admin_disputes_service_1 = require("./admin-disputes.service");
const supabase_service_1 = require("../supabase/supabase.service");
let AdminController = class AdminController {
    usersService;
    verificationsService;
    transactionsService;
    disputesService;
    supabaseService;
    constructor(usersService, verificationsService, transactionsService, disputesService, supabaseService) {
        this.usersService = usersService;
        this.verificationsService = verificationsService;
        this.transactionsService = transactionsService;
        this.disputesService = disputesService;
        this.supabaseService = supabaseService;
    }
    async getDashboardStats() {
        const supabase = this.supabaseService.getServiceClient();
        const [profiles, bookings, payments, educators] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('bookings').select('id', { count: 'exact', head: true }),
            supabase
                .from('payments')
                .select('amount_cents')
                .eq('status', 'completed'),
            supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('role', 'educator')
                .eq('is_active', true),
        ]);
        const totalRevenue = (payments.data || []).reduce((sum, p) => sum + p.amount_cents, 0);
        return {
            total_users: profiles.count || 0,
            total_bookings: bookings.count || 0,
            total_revenue_cents: totalRevenue,
            active_educators: educators.count || 0,
        };
    }
    async listUsers(page, limit, role, search, isActive) {
        return this.usersService.listUsers(page || 1, limit || 20, role, search, isActive !== undefined ? isActive === 'true' : undefined);
    }
    async updateUserStatus(userId, body) {
        return this.usersService.updateUserStatus(userId, body.is_active);
    }
    async listPendingVerifications(page, limit) {
        return this.verificationsService.listPending(page || 1, limit || 20);
    }
    async updateVerification(user, verificationId, body) {
        if (body.action === 'approve') {
            return this.verificationsService.approve(verificationId, user.profileId);
        }
        return this.verificationsService.reject(verificationId, user.profileId, body.reason || 'Non spécifié');
    }
    async listTransactions(page, limit, status, dateFrom, dateTo) {
        return this.transactionsService.listTransactions(page || 1, limit || 20, status, dateFrom, dateTo);
    }
    async getCommissionSummary(period) {
        return this.transactionsService.getCommissionSummary(period);
    }
    async listDisputes(page, limit, status) {
        return this.disputesService.listDisputes(page || 1, limit || 20, status);
    }
    async resolveDispute(user, disputeId, body) {
        return this.disputesService.resolveDispute(disputeId, user.profileId, body.resolution_notes, body.resolution_type);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Statistiques du tableau de bord' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'Lister les utilisateurs' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'is_active', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('is_active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Activer/suspendre un utilisateur' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.Get)('verifications/pending'),
    (0, swagger_1.ApiOperation)({ summary: 'Lister les vérifications en attente' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listPendingVerifications", null);
__decorate([
    (0, common_1.Patch)('verifications/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Approuver ou rejeter une vérification' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateVerification", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Lister les transactions' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'date_from', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'date_to', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('date_from')),
    __param(4, (0, common_1.Query)('date_to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listTransactions", null);
__decorate([
    (0, common_1.Get)('commissions/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Résumé des commissions' }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        required: false,
        enum: ['week', 'month', 'year'],
    }),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getCommissionSummary", null);
__decorate([
    (0, common_1.Get)('disputes'),
    (0, swagger_1.ApiOperation)({ summary: 'Lister les litiges' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listDisputes", null);
__decorate([
    (0, common_1.Patch)('disputes/:id/resolve'),
    (0, swagger_1.ApiOperation)({ summary: 'Résoudre un litige' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resolveDispute", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin'),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [admin_users_service_1.AdminUsersService,
        admin_verifications_service_1.AdminVerificationsService,
        admin_transactions_service_1.AdminTransactionsService,
        admin_disputes_service_1.AdminDisputesService,
        supabase_service_1.SupabaseService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map