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
var TasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const supabase_service_1 = require("../supabase/supabase.service");
const payouts_service_1 = require("../payments/payouts.service");
const payments_service_1 = require("../payments/payments.service");
const stripe_service_1 = require("../payments/stripe.service");
const notifications_service_1 = require("../notifications/notifications.service");
let TasksService = TasksService_1 = class TasksService {
    supabaseService;
    payoutsService;
    paymentsService;
    stripeService;
    notificationsService;
    logger = new common_1.Logger(TasksService_1.name);
    constructor(supabaseService, payoutsService, paymentsService, stripeService, notificationsService) {
        this.supabaseService = supabaseService;
        this.payoutsService = payoutsService;
        this.paymentsService = paymentsService;
        this.stripeService = stripeService;
        this.notificationsService = notificationsService;
    }
    async processPayouts() {
        this.logger.log('Traitement des paiements en attente...');
        const results = await this.payoutsService.processPendingPayouts();
        this.logger.log(`Paiements traités: ${results.length} (complétés: ${results.filter((r) => r.status === 'completed').length})`);
    }
    async sendBookingReminders() {
        const supabase = this.supabaseService.getServiceClient();
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        const { data: upcomingBookings } = await supabase
            .from('bookings')
            .select('id, parent_profile_id, educator_profile_id, booking_date_start, parent_profiles(profile_id), educator_profiles(profile_id)')
            .eq('status', 'confirmed')
            .gte('booking_date_start', in24h.toISOString())
            .lt('booking_date_start', in25h.toISOString());
        if (!upcomingBookings || upcomingBookings.length === 0)
            return;
        for (const booking of upcomingBookings) {
            const parentProfileId = booking.parent_profiles?.profile_id;
            const educatorProfileId = booking.educator_profiles?.profile_id;
            if (parentProfileId) {
                await this.notificationsService.create({
                    profile_id: parentProfileId,
                    notification_type: 'booking_reminder',
                    title: 'Rappel de réservation',
                    message: 'Votre réservation est prévue dans 24 heures.',
                    related_booking_id: booking.id,
                });
            }
            if (educatorProfileId) {
                await this.notificationsService.create({
                    profile_id: educatorProfileId,
                    notification_type: 'booking_reminder',
                    title: 'Rappel de réservation',
                    message: 'Vous avez une réservation prévue dans 24 heures.',
                    related_booking_id: booking.id,
                });
            }
        }
        this.logger.log(`Rappels envoyés pour ${upcomingBookings.length} réservation(s)`);
    }
    async cleanupStaleBookings() {
        const supabase = this.supabaseService.getServiceClient();
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: staleBookings, error: queryError } = await supabase
            .from('bookings')
            .select('id, payments(stripe_payment_intent_id, created_at)')
            .eq('status', 'pending_payment')
            .lt('created_at', thirtyMinAgo);
        if (queryError) {
            this.logger.error(`Stale-booking query failed: ${queryError.message}`);
            return;
        }
        if (!staleBookings || staleBookings.length === 0)
            return;
        let recovered = 0;
        let cancelled = 0;
        const idsToCancel = [];
        for (const booking of staleBookings) {
            const latestPayment = (booking.payments ?? [])
                .filter((p) => p.stripe_payment_intent_id)
                .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];
            if (latestPayment?.stripe_payment_intent_id) {
                try {
                    const intent = await this.stripeService.retrievePaymentIntent(latestPayment.stripe_payment_intent_id);
                    if (intent && intent.status === 'succeeded') {
                        await this.paymentsService.handlePaymentSuccess(intent);
                        recovered++;
                        this.logger.log(`Recovered booking ${booking.id} from missed webhook (intent ${intent.id})`);
                        continue;
                    }
                }
                catch (err) {
                    this.logger.warn(`Stripe lookup failed for booking ${booking.id}: ${err instanceof Error ? err.message : err}`);
                }
            }
            idsToCancel.push(booking.id);
        }
        if (idsToCancel.length > 0) {
            await supabase
                .from('bookings')
                .update({
                status: 'cancelled',
                cancellation_reason: 'Paiement non reçu dans les 30 minutes',
                cancelled_at: new Date().toISOString(),
            })
                .in('id', idsToCancel);
            cancelled = idsToCancel.length;
        }
        this.logger.log(`Cleanup stale bookings: ${recovered} recovered (paid but webhook missed), ${cancelled} cancelled (truly abandoned)`);
    }
    async checkExpiredVerifications() {
        const supabase = this.supabaseService.getServiceClient();
        const today = new Date().toISOString().split('T')[0];
        const { data: expired } = await supabase
            .from('educator_verifications')
            .select('id, educator_profile_id')
            .eq('status', 'verified')
            .lt('expiry_date', today)
            .not('expiry_date', 'is', null);
        if (!expired || expired.length === 0)
            return;
        const ids = expired.map((v) => v.id);
        await supabase
            .from('educator_verifications')
            .update({ status: 'expired' })
            .in('id', ids);
        for (const verification of expired) {
            const { data: edProfile } = await supabase
                .from('educator_profiles')
                .select('profile_id')
                .eq('id', verification.educator_profile_id)
                .single();
            if (edProfile) {
                await this.notificationsService.create({
                    profile_id: edProfile.profile_id,
                    notification_type: 'profile_verification_status',
                    title: 'Vérification expirée',
                    message: 'Un de vos documents de vérification a expiré. Veuillez le renouveler.',
                });
            }
        }
        this.logger.log(`${expired.length} vérification(s) marquée(s) comme expirée(s)`);
    }
};
exports.TasksService = TasksService;
__decorate([
    (0, schedule_1.Cron)('0 10 * * 5', { timeZone: 'America/Toronto' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksService.prototype, "processPayouts", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksService.prototype, "sendBookingReminders", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksService.prototype, "cleanupStaleBookings", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksService.prototype, "checkExpiredVerifications", null);
exports.TasksService = TasksService = TasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        payouts_service_1.PayoutsService,
        payments_service_1.PaymentsService,
        stripe_service_1.StripeService,
        notifications_service_1.NotificationsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map