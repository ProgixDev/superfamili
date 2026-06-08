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
exports.AdminDisputesService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const notifications_service_1 = require("../notifications/notifications.service");
let AdminDisputesService = class AdminDisputesService {
    supabaseService;
    notificationsService;
    constructor(supabaseService, notificationsService) {
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
    }
    async listDisputes(page = 1, limit = 20, status) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        let query = supabase
            .from('disputes')
            .select('*, bookings(*, services(name)), profiles:opened_by_profile_id(first_name, last_name, email)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (status)
            query = query.eq('status', status);
        const { data, error, count } = await query;
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des litiges');
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
    async resolveDispute(disputeId, adminProfileId, resolutionNotes, resolutionType) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('disputes')
            .update({
            status: 'resolved',
            resolution_notes: resolutionNotes,
            resolution_type: resolutionType,
            decided_at: new Date().toISOString(),
            decided_by_profile_id: adminProfileId,
        })
            .eq('id', disputeId)
            .select('*, bookings(parent_profile_id, educator_profile_id)')
            .single();
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la résolution du litige');
        }
        if (data) {
            await this.notificationsService.create({
                profile_id: data.opened_by_profile_id,
                notification_type: 'dispute_opened',
                title: 'Litige résolu',
                message: `Votre litige a été résolu. Décision: ${resolutionType}`,
                related_booking_id: data.booking_id,
            });
        }
        return data;
    }
};
exports.AdminDisputesService = AdminDisputesService;
exports.AdminDisputesService = AdminDisputesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService])
], AdminDisputesService);
//# sourceMappingURL=admin-disputes.service.js.map