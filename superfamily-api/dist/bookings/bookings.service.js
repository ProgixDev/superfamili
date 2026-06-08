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
var BookingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const pricing_util_1 = require("../common/utils/pricing.util");
const notifications_service_1 = require("../notifications/notifications.service");
const payouts_service_1 = require("../payments/payouts.service");
const payments_service_1 = require("../payments/payments.service");
const educators_service_1 = require("../educators/educators.service");
let BookingsService = BookingsService_1 = class BookingsService {
    supabaseService;
    notificationsService;
    payoutsService;
    paymentsService;
    educatorsService;
    logger = new common_1.Logger(BookingsService_1.name);
    constructor(supabaseService, notificationsService, payoutsService, paymentsService, educatorsService) {
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
        this.payoutsService = payoutsService;
        this.paymentsService = paymentsService;
        this.educatorsService = educatorsService;
    }
    async create(profileId, dto) {
        if (!profileId) {
            this.logger.error('BookingsService.create called with no profileId — guard misconfigured');
            throw new common_1.UnauthorizedException('Profil utilisateur introuvable. Veuillez vous reconnecter.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { data: parentProfile, error: parentError } = await supabase
            .from('parent_profiles')
            .select('id')
            .eq('profile_id', profileId)
            .maybeSingle();
        if (parentError) {
            this.logger.error(`parent_profiles lookup failed for profile ${profileId}: ${parentError.message}`);
            throw new common_1.BadRequestException('Erreur lors de la vérification du profil parent.');
        }
        if (!parentProfile) {
            throw new common_1.ForbiddenException('Aucun profil parent associé à ce compte. Seuls les comptes parents peuvent créer des réservations.');
        }
        const dedupWindowAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: existingPending } = await supabase
            .from('bookings')
            .select('*')
            .eq('parent_profile_id', parentProfile.id)
            .eq('educator_profile_id', dto.educator_profile_id)
            .eq('service_id', dto.service_id)
            .eq('booking_date_start', dto.booking_date_start)
            .eq('booking_date_end', dto.booking_date_end)
            .eq('status', 'pending_payment')
            .gte('created_at', dedupWindowAgo)
            .order('created_at', { ascending: false })
            .limit(1);
        if (existingPending && existingPending.length > 0) {
            this.logger.log(`Reusing pending booking ${existingPending[0].id} (dedup) for parent ${parentProfile.id}`);
            return existingPending[0];
        }
        const { data: educatorService } = await supabase
            .from('educator_services')
            .select('hourly_rate_cents')
            .eq('educator_profile_id', dto.educator_profile_id)
            .eq('service_id', dto.service_id)
            .eq('is_active', true)
            .single();
        if (!educatorService) {
            throw new common_1.BadRequestException("Ce service n'est pas offert par cet éducateur");
        }
        const { data: parentLocation } = await supabase
            .from('profiles')
            .select('postal_code')
            .eq('id', profileId)
            .single();
        const { data: educatorProfile } = await supabase
            .from('educator_profiles')
            .select('profile_id, profiles!educator_profiles_profile_id_fkey(postal_code)')
            .eq('id', dto.educator_profile_id)
            .single();
        let distanceKm = 0;
        if (parentLocation?.postal_code &&
            educatorProfile?.profiles?.postal_code) {
            const { data: locations } = await supabase
                .from('postal_codes')
                .select('postal_code, latitude, longitude')
                .in('postal_code', [
                dto.location_postal_code,
                educatorProfile.profiles.postal_code,
            ]);
            if (locations && locations.length === 2) {
                const R = 6371;
                const dLat = this.toRad(locations[1].latitude - locations[0].latitude);
                const dLon = this.toRad(locations[1].longitude - locations[0].longitude);
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(this.toRad(locations[0].latitude)) *
                        Math.cos(this.toRad(locations[1].latitude)) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distanceKm = R * c;
            }
        }
        const { data: settings } = await supabase
            .from('platform_settings')
            .select('*')
            .limit(1)
            .single();
        const commissionPercent = settings?.platform_commission_percentage || 30;
        const freeMileageKm = settings?.free_mileage_km || 20;
        const mileageFeePerKm = settings?.mileage_fee_per_km_cents || 100;
        const pricing = (0, pricing_util_1.calculateBookingPricing)({
            hourlyRateCents: educatorService.hourly_rate_cents,
            durationHours: dto.duration_hours,
            distanceKm,
            platformCommissionPercent: commissionPercent,
            freeMileageKm,
            mileageFeePerKmCents: mileageFeePerKm,
        });
        const { data: locationData } = await supabase
            .from('postal_codes')
            .select('latitude, longitude')
            .eq('postal_code', dto.location_postal_code)
            .single();
        const maxChildren = await this.educatorsService.getMaxChildrenForEducator(dto.educator_profile_id);
        const { data: overlapping, error: overlapError } = await supabase
            .from('bookings')
            .select('id, child_id')
            .eq('educator_profile_id', dto.educator_profile_id)
            .in('status', ['pending_payment', 'confirmed', 'in_progress'])
            .lt('booking_date_start', dto.booking_date_end)
            .gt('booking_date_end', dto.booking_date_start);
        if (overlapError) {
            this.logger.error(`Overlap query failed for educator ${dto.educator_profile_id}: ${overlapError.message}`);
            throw new common_1.BadRequestException('Erreur lors de la vérification de la disponibilité.');
        }
        const existingChildCount = (overlapping || []).length;
        const newChildCount = dto.child_id ? 1 : 0;
        const totalChildren = existingChildCount + newChildCount;
        if (totalChildren > maxChildren) {
            throw new common_1.BadRequestException(`Cet éducateur a atteint sa limite de ${maxChildren} enfants simultanés. Loi du Québec sur la garde d'enfants.`);
        }
        const { data: booking, error } = await supabase
            .from('bookings')
            .insert({
            parent_profile_id: parentProfile.id,
            educator_profile_id: dto.educator_profile_id,
            service_id: dto.service_id,
            child_id: dto.child_id,
            booking_date_start: dto.booking_date_start,
            booking_date_end: dto.booking_date_end,
            duration_hours: dto.duration_hours,
            location_postal_code: dto.location_postal_code,
            location_latitude: locationData?.latitude,
            location_longitude: locationData?.longitude,
            location_point: locationData
                ? `POINT(${locationData.longitude} ${locationData.latitude})`
                : null,
            distance_km: Math.round(distanceKm * 100) / 100,
            mileage_fee_cents: pricing.mileageFeeCents,
            base_rate_cents: educatorService.hourly_rate_cents,
            hourly_rate_cents: educatorService.hourly_rate_cents,
            subtotal_cents: pricing.subtotalCents,
            platform_commission_cents: pricing.platformCommissionCents,
            educator_earnings_cents: pricing.educatorEarningsCents,
            total_amount_cents: pricing.totalAmountCents,
            status: 'pending_payment',
            notes: dto.notes,
            special_requests: dto.special_requests,
        })
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la création de la réservation');
        }
        return booking;
    }
    async findAll(profileId, role, page = 1, limit = 20, status) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        let profileField;
        if (role === 'parent') {
            const { data: pp } = await supabase
                .from('parent_profiles')
                .select('id')
                .eq('profile_id', profileId)
                .single();
            if (!pp)
                throw new common_1.NotFoundException('Profil non trouvé');
            profileField = 'parent_profile_id';
            let query = supabase
                .from('bookings')
                .select('*, educator_profiles(*, profiles!educator_profiles_profile_id_fkey(first_name, last_name, avatar_url)), services(*)', { count: 'exact' })
                .eq(profileField, pp.id)
                .order('booking_date_start', { ascending: false })
                .range(offset, offset + limit - 1);
            if (status)
                query = query.eq('status', status);
            const { data, error, count } = await query;
            if (error) {
                this.logger.error(`Parent bookings query failed (profile ${profileId}): ${error.message}`);
                throw new common_1.BadRequestException('Erreur lors de la récupération des réservations');
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
        else {
            const { data: ep } = await supabase
                .from('educator_profiles')
                .select('id')
                .eq('profile_id', profileId)
                .single();
            if (!ep)
                throw new common_1.NotFoundException('Profil non trouvé');
            profileField = 'educator_profile_id';
            let query = supabase
                .from('bookings')
                .select('*, parent_profiles(*, profiles(first_name, last_name, avatar_url)), services(*)', { count: 'exact' })
                .eq(profileField, ep.id)
                .order('booking_date_start', { ascending: false })
                .range(offset, offset + limit - 1);
            if (status)
                query = query.eq('status', status);
            const { data, error, count } = await query;
            if (error) {
                this.logger.error(`Educator bookings query failed (profile ${profileId}): ${error.message}`);
                throw new common_1.BadRequestException('Erreur lors de la récupération des réservations');
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
    }
    async findOne(bookingId, profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('bookings')
            .select(`*,
        parent_profiles(*, profiles(first_name, last_name, avatar_url, email, phone)),
        educator_profiles(*, profiles!educator_profiles_profile_id_fkey(first_name, last_name, avatar_url, email, phone)),
        services(*),
        payments(*),
        reviews(*)`)
            .eq('id', bookingId)
            .single();
        if (error || !data) {
            if (error) {
                this.logger.error(`Booking detail query failed (booking ${bookingId}): ${error.message}`);
            }
            throw new common_1.NotFoundException('Réservation non trouvée');
        }
        return data;
    }
    async cancel(bookingId, profileId, dto) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
        if (!booking) {
            throw new common_1.NotFoundException('Réservation non trouvée');
        }
        if (['completed', 'cancelled', 'refunded'].includes(booking.status)) {
            throw new common_1.BadRequestException('Cette réservation ne peut pas être annulée');
        }
        const { data, error } = await supabase
            .from('bookings')
            .update({
            status: 'cancelled',
            cancelled_by_profile_id: profileId,
            cancellation_reason: dto.cancellation_reason,
            cancelled_at: new Date().toISOString(),
        })
            .eq('id', bookingId)
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de l'annulation de la réservation");
        }
        if (booking.status === 'confirmed') {
            try {
                const hoursUntilBooking = (new Date(booking.booking_date_start).getTime() - Date.now()) /
                    (1000 * 60 * 60);
                if (hoursUntilBooking > 24) {
                    await this.paymentsService.processRefund(bookingId);
                }
                else {
                    const cancellationFee = Math.round(booking.subtotal_cents * 0.25);
                    const refundAmount = booking.total_amount_cents - cancellationFee;
                    if (refundAmount > 0) {
                        await this.paymentsService.processRefund(bookingId, refundAmount);
                    }
                }
            }
            catch (err) {
                console.error('Refund failed during cancellation:', err);
            }
        }
        await this.notificationsService.create({
            profile_id: booking.parent_profile_id,
            notification_type: 'booking_cancelled',
            title: 'Réservation annulée',
            message: `Votre réservation a été annulée.`,
            related_booking_id: bookingId,
        });
        return data;
    }
    async complete(bookingId, profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
        if (!booking) {
            throw new common_1.NotFoundException('Réservation non trouvée');
        }
        if (booking.status !== 'in_progress' && booking.status !== 'confirmed') {
            throw new common_1.BadRequestException('Seules les réservations en cours peuvent être complétées');
        }
        const { data, error } = await supabase
            .from('bookings')
            .update({ status: 'completed' })
            .eq('id', bookingId)
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la complétion de la réservation');
        }
        await this.payoutsService.createPayoutRecord(bookingId);
        await this.notificationsService.create({
            profile_id: booking.parent_profile_id,
            notification_type: 'review_request',
            title: 'Laissez un avis',
            message: "Le service est terminé. N'hésitez pas à laisser un avis!",
            related_booking_id: bookingId,
        });
        return data;
    }
    toRad(deg) {
        return deg * (Math.PI / 180);
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = BookingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService,
        payouts_service_1.PayoutsService,
        payments_service_1.PaymentsService,
        educators_service_1.EducatorsService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map