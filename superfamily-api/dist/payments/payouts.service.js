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
var PayoutsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const notifications_service_1 = require("../notifications/notifications.service");
let PayoutsService = PayoutsService_1 = class PayoutsService {
    supabaseService;
    notificationsService;
    logger = new common_1.Logger(PayoutsService_1.name);
    constructor(supabaseService, notificationsService) {
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
    }
    async createPayoutRecord(bookingId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: booking } = await supabase
            .from('bookings')
            .select('*, educator_profiles!educator_profiles_profile_id_fkey(stripe_account_id)')
            .eq('id', bookingId)
            .single();
        if (!booking)
            return;
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 7);
        await supabase.from('payouts').insert({
            educator_profile_id: booking.educator_profile_id,
            booking_id: bookingId,
            stripe_account_id: booking.educator_profiles.stripe_account_id,
            gross_amount_cents: booking.subtotal_cents,
            platform_fee_cents: booking.platform_commission_cents,
            net_amount_cents: booking.educator_earnings_cents,
            currency: 'CAD',
            status: 'pending',
            service_completion_date: new Date().toISOString().split('T')[0],
            payout_scheduled_date: scheduledDate.toISOString().split('T')[0],
        });
        this.logger.log(`Payout record created for booking ${bookingId}`);
    }
    async processPendingPayouts() {
        const supabase = this.supabaseService.getServiceClient();
        const today = new Date().toISOString().split('T')[0];
        const { data: payouts } = await supabase
            .from('payouts')
            .select('*, educator_profiles(profile_id)')
            .eq('status', 'pending')
            .lte('payout_scheduled_date', today);
        if (!payouts || payouts.length === 0) {
            this.logger.log('No pending payouts to process');
            return [];
        }
        const results = [];
        for (const payout of payouts) {
            try {
                await supabase
                    .from('payouts')
                    .update({
                    status: 'completed',
                    payout_completed_date: today,
                })
                    .eq('id', payout.id);
                const edProfileId = payout.educator_profiles?.profile_id;
                if (edProfileId) {
                    await this.notificationsService.create({
                        profile_id: edProfileId,
                        notification_type: 'payout_completed',
                        title: 'Paiement reçu',
                        message: `Votre paiement de ${(payout.net_amount_cents / 100).toFixed(2)} $ CAD a été traité.`,
                        related_booking_id: payout.booking_id,
                    });
                }
                results.push({ payout_id: payout.id, status: 'completed' });
                this.logger.log(`Payout ${payout.id} completed`);
            }
            catch (err) {
                await supabase
                    .from('payouts')
                    .update({ status: 'failed', reason_held: err.message })
                    .eq('id', payout.id);
                results.push({
                    payout_id: payout.id,
                    status: 'failed',
                    error: err.message,
                });
            }
        }
        return results;
    }
    async getEducatorPayouts(profileId, page = 1, limit = 20) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        const { data: educatorProfile } = await supabase
            .from('educator_profiles')
            .select('id')
            .eq('profile_id', profileId)
            .single();
        if (!educatorProfile) {
            return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
        }
        const { data, count } = await supabase
            .from('payouts')
            .select('*, bookings(booking_date_start, services(name))', {
            count: 'exact',
        })
            .eq('educator_profile_id', educatorProfile.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        return {
            data: data || [],
            meta: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }
    async getAnnualReport(profileId, year) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: educatorProfile } = await supabase
            .from('educator_profiles')
            .select('id, profiles!educator_profiles_profile_id_fkey(first_name, last_name, email)')
            .eq('profile_id', profileId)
            .single();
        if (!educatorProfile) {
            throw new common_1.BadRequestException('Profil educateur non trouve');
        }
        const startDate = `${year}-01-01T00:00:00`;
        const endDate = `${year}-12-31T23:59:59`;
        const { data: payouts, error } = await supabase
            .from('payouts')
            .select('id, gross_amount_cents, platform_fee_cents, net_amount_cents, status, created_at, booking_id')
            .eq('educator_profile_id', educatorProfile.id)
            .in('status', ['paid', 'completed'])
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la recuperation des donnees');
        }
        const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            month_name: new Date(year, i).toLocaleDateString('fr-CA', {
                month: 'long',
            }),
            gross_amount_cents: 0,
            platform_fee_cents: 0,
            net_amount_cents: 0,
            booking_count: 0,
        }));
        let totalGross = 0;
        let totalFees = 0;
        let totalNet = 0;
        let totalBookings = 0;
        for (const payout of payouts || []) {
            const month = new Date(payout.created_at).getMonth();
            monthlyBreakdown[month].gross_amount_cents +=
                payout.gross_amount_cents || 0;
            monthlyBreakdown[month].platform_fee_cents +=
                payout.platform_fee_cents || 0;
            monthlyBreakdown[month].net_amount_cents += payout.net_amount_cents || 0;
            monthlyBreakdown[month].booking_count += 1;
            totalGross += payout.gross_amount_cents || 0;
            totalFees += payout.platform_fee_cents || 0;
            totalNet += payout.net_amount_cents || 0;
            totalBookings += 1;
        }
        const profile = educatorProfile.profiles;
        return {
            year,
            educator: {
                name: `${profile.first_name} ${profile.last_name}`,
                email: profile.email,
            },
            summary: {
                total_gross_cents: totalGross,
                total_platform_fees_cents: totalFees,
                total_net_earnings_cents: totalNet,
                total_bookings: totalBookings,
            },
            monthly_breakdown: monthlyBreakdown,
            transactions: payouts || [],
            generated_at: new Date().toISOString(),
            disclaimer: "Ce document est un releve de revenus genere par SuperFamily. Il ne constitue pas un document fiscal officiel. Consultez un comptable pour vos declarations d'impots.",
        };
    }
};
exports.PayoutsService = PayoutsService;
exports.PayoutsService = PayoutsService = PayoutsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService])
], PayoutsService);
//# sourceMappingURL=payouts.service.js.map