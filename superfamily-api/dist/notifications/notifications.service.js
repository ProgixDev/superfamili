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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let NotificationsService = class NotificationsService {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async create(dto) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('notifications')
            .insert({
            profile_id: dto.profile_id,
            notification_type: dto.notification_type,
            title: dto.title,
            message: dto.message,
            related_booking_id: dto.related_booking_id,
            related_conversation_id: dto.related_conversation_id,
            data: dto.data || {},
            channel: 'in_app',
            is_sent: true,
            sent_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (error) {
            console.error('Failed to create notification:', error);
            return null;
        }
        return data;
    }
    async findAll(profileId, page = 1, limit = 20) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des notifications');
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
    async markAsRead(notificationId, profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('profile_id', profileId)
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException('Erreur lors du marquage de la notification');
        }
        return data;
    }
    async markAllAsRead(profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('profile_id', profileId)
            .eq('is_read', false);
        if (error) {
            throw new common_1.BadRequestException('Erreur lors du marquage des notifications');
        }
        return { message: 'Toutes les notifications ont été marquées comme lues' };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map