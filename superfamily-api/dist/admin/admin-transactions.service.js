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
exports.AdminTransactionsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let AdminTransactionsService = class AdminTransactionsService {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async listTransactions(page = 1, limit = 20, status, dateFrom, dateTo) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        let query = supabase
            .from('payments')
            .select('*, bookings(*, parent_profiles(profiles(first_name, last_name)), educator_profiles(profiles!educator_profiles_profile_id_fkey(first_name, last_name)), services(name))', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (status)
            query = query.eq('status', status);
        if (dateFrom)
            query = query.gte('created_at', dateFrom);
        if (dateTo)
            query = query.lte('created_at', dateTo);
        const { data, error, count } = await query;
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des transactions');
        }
        return {
            data,
            meta: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }
    async getCommissionSummary(period) {
        const supabase = this.supabaseService.getServiceClient();
        const dateFilter = new Date();
        switch (period) {
            case 'week':
                dateFilter.setDate(dateFilter.getDate() - 7);
                break;
            case 'month':
                dateFilter.setMonth(dateFilter.getMonth() - 1);
                break;
            case 'year':
                dateFilter.setFullYear(dateFilter.getFullYear() - 1);
                break;
            default:
                dateFilter.setMonth(dateFilter.getMonth() - 1);
        }
        const { data: bookings } = await supabase
            .from('bookings')
            .select('total_amount_cents, subtotal_cents, platform_commission_cents, educator_earnings_cents, mileage_fee_cents')
            .eq('status', 'completed')
            .gte('created_at', dateFilter.toISOString());
        const summary = (bookings || []).reduce((acc, b) => ({
            total_revenue: acc.total_revenue + b.total_amount_cents,
            total_subtotal: acc.total_subtotal + b.subtotal_cents,
            total_commission: acc.total_commission + b.platform_commission_cents,
            total_educator_earnings: acc.total_educator_earnings + b.educator_earnings_cents,
            total_mileage_fees: acc.total_mileage_fees + b.mileage_fee_cents,
            booking_count: acc.booking_count + 1,
        }), {
            total_revenue: 0,
            total_subtotal: 0,
            total_commission: 0,
            total_educator_earnings: 0,
            total_mileage_fees: 0,
            booking_count: 0,
        });
        return { period: period || 'month', ...summary };
    }
};
exports.AdminTransactionsService = AdminTransactionsService;
exports.AdminTransactionsService = AdminTransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], AdminTransactionsService);
//# sourceMappingURL=admin-transactions.service.js.map