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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const notifications_service_1 = require("../notifications/notifications.service");
let ReviewsService = class ReviewsService {
    supabaseService;
    notificationsService;
    constructor(supabaseService, notificationsService) {
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
    }
    async create(profileId, dto) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: parentProfile } = await supabase
            .from('parent_profiles')
            .select('id')
            .eq('profile_id', profileId)
            .single();
        if (!parentProfile) {
            throw new common_1.BadRequestException('Profil parent non trouvé');
        }
        const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', dto.booking_id)
            .eq('parent_profile_id', parentProfile.id)
            .eq('status', 'completed')
            .single();
        if (!booking) {
            throw new common_1.BadRequestException('Réservation invalide ou non complétée');
        }
        const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('booking_id', dto.booking_id)
            .single();
        if (existingReview) {
            throw new common_1.BadRequestException('Un avis a déjà été laissé pour cette réservation');
        }
        const { data, error } = await supabase
            .from('reviews')
            .insert({
            booking_id: dto.booking_id,
            parent_profile_id: parentProfile.id,
            educator_profile_id: booking.educator_profile_id,
            rating: dto.rating,
            review_text: dto.review_text,
            cleanliness_rating: dto.cleanliness_rating,
            communication_rating: dto.communication_rating,
            reliability_rating: dto.reliability_rating,
            engagement_rating: dto.engagement_rating,
        })
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de la création de l'avis");
        }
        const { data: edProfile } = await supabase
            .from('educator_profiles')
            .select('profile_id')
            .eq('id', booking.educator_profile_id)
            .single();
        if (edProfile) {
            await this.notificationsService.create({
                profile_id: edProfile.profile_id,
                notification_type: 'rating_received',
                title: 'Nouvel avis reçu',
                message: `Vous avez reçu un avis de ${dto.rating} étoile(s).`,
                related_booking_id: dto.booking_id,
            });
        }
        return data;
    }
    async findByEducator(educatorProfileId, page = 1, limit = 20) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('reviews')
            .select('*, parent_profiles(profiles(first_name, last_name, avatar_url))', { count: 'exact' })
            .eq('educator_profile_id', educatorProfileId)
            .eq('is_flagged', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new common_1.NotFoundException('Éducateur non trouvé');
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
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map