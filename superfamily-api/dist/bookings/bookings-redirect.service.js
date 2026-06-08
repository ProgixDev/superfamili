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
exports.BookingsRedirectService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const notifications_service_1 = require("../notifications/notifications.service");
let BookingsRedirectService = class BookingsRedirectService {
    supabaseService;
    notificationsService;
    constructor(supabaseService, notificationsService) {
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
    }
    async findReplacementEducators(bookingId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
        if (!booking)
            return [];
        const { data: educators } = await supabase
            .from('educator_services')
            .select(`*,
        educator_profiles!inner(
          id, average_rating, completion_rate,
          profiles!educator_profiles_profile_id_fkey(
            first_name, last_name, avatar_url, postal_code,
            is_active, is_verified, latitude, longitude
          )
        )`)
            .eq('service_id', booking.service_id)
            .eq('is_active', true)
            .eq('educator_profiles.profiles.is_active', true)
            .eq('educator_profiles.profiles.is_verified', true)
            .neq('educator_profile_id', booking.educator_profile_id)
            .order('educator_profiles.average_rating', { ascending: false })
            .limit(10);
        if (!educators || educators.length === 0) {
            await this.notificationsService.create({
                profile_id: booking.parent_profile_id,
                notification_type: 'booking_cancelled',
                title: 'Aucun éducateur de remplacement disponible',
                message: "Nous n'avons pas trouvé d'éducateur de remplacement. Un remboursement sera effectué.",
                related_booking_id: bookingId,
            });
            return [];
        }
        await this.notificationsService.create({
            profile_id: booking.parent_profile_id,
            notification_type: 'educator_nearby',
            title: 'Éducateurs de remplacement disponibles',
            message: `${educators.length} éducateur(s) disponible(s) pour remplacer votre réservation annulée.`,
            related_booking_id: bookingId,
            data: {
                replacement_educators: educators.map((e) => e.educator_profiles.id),
            },
        });
        return educators;
    }
};
exports.BookingsRedirectService = BookingsRedirectService;
exports.BookingsRedirectService = BookingsRedirectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService])
], BookingsRedirectService);
//# sourceMappingURL=bookings-redirect.service.js.map