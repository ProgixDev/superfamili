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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_service_1 = require("./stripe.service");
const supabase_service_1 = require("../supabase/supabase.service");
const notifications_service_1 = require("../notifications/notifications.service");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    stripeService;
    configService;
    supabaseService;
    notificationsService;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(stripeService, configService, supabaseService, notificationsService) {
        this.stripeService = stripeService;
        this.configService = configService;
        this.supabaseService = supabaseService;
        this.notificationsService = notificationsService;
    }
    async createConnectAccount(profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: educatorProfile } = await supabase
            .from('educator_profiles')
            .select('id, stripe_account_id, profiles!educator_profiles_profile_id_fkey(email, first_name, last_name)')
            .eq('profile_id', profileId)
            .single();
        if (!educatorProfile) {
            throw new common_1.NotFoundException("Profil d'éducateur non trouvé");
        }
        const profile = educatorProfile.profiles;
        const fullName = `${profile.first_name} ${profile.last_name}`;
        const frontendUrl = this.configService.get('frontendUrl') || 'http://localhost:3000';
        if (educatorProfile.stripe_account_id) {
            const accountLink = await this.stripeService.createAccountLink(educatorProfile.stripe_account_id, `${frontendUrl}/educateur/onboarding/stripe/refresh`, `${frontendUrl}/educateur/onboarding/stripe/complete`);
            return {
                account_id: educatorProfile.stripe_account_id,
                onboarding_url: accountLink.url,
            };
        }
        let account;
        try {
            account = await this.stripeService.createExpressAccount(profile.email, fullName);
        }
        catch (err) {
            this.logger.error(`Stripe account creation failed: ${err.message}`);
            throw new common_1.BadRequestException(err.message || 'Erreur lors de la création du compte Stripe');
        }
        await supabase
            .from('educator_profiles')
            .update({
            stripe_account_id: account.id,
            stripe_account_status: 'pending',
        })
            .eq('id', educatorProfile.id);
        const accountLink = await this.stripeService.createAccountLink(account.id, `${frontendUrl}/educateur/onboarding/stripe/refresh`, `${frontendUrl}/educateur/onboarding/stripe/complete`);
        return {
            account_id: account.id,
            onboarding_url: accountLink.url,
        };
    }
    async getConnectStatus(profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: educatorProfile } = await supabase
            .from('educator_profiles')
            .select('stripe_account_id, stripe_account_status, banking_details_verified')
            .eq('profile_id', profileId)
            .single();
        if (!educatorProfile?.stripe_account_id) {
            return {
                connected: false,
                status: null,
                charges_enabled: false,
                payouts_enabled: false,
            };
        }
        const account = await this.stripeService.getAccount(educatorProfile.stripe_account_id);
        const newStatus = account.charges_enabled ? 'active' : 'pending';
        if (newStatus !== educatorProfile.stripe_account_status) {
            await supabase
                .from('educator_profiles')
                .update({
                stripe_account_status: newStatus,
                banking_details_verified: account.charges_enabled && account.payouts_enabled,
            })
                .eq('stripe_account_id', account.id);
        }
        return {
            connected: true,
            account_id: educatorProfile.stripe_account_id,
            status: newStatus,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
        };
    }
    async createPaymentIntent(bookingId, parentProfileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`*,
        educator_profiles(stripe_account_id, stripe_account_status),
        parent_profiles(id, stripe_customer_id, profile_id, profiles(email, first_name, last_name))`)
            .eq('id', bookingId)
            .single();
        if (error || !booking) {
            throw new common_1.NotFoundException('Réservation non trouvée');
        }
        if (booking.status !== 'pending_payment') {
            throw new common_1.BadRequestException(`Réservation en statut "${booking.status}" — paiement impossible`);
        }
        const educatorStripeId = booking.educator_profiles.stripe_account_id;
        if (!educatorStripeId ||
            booking.educator_profiles.stripe_account_status !== 'active') {
            throw new common_1.BadRequestException("L'éducateur n'a pas complété son inscription Stripe");
        }
        const parentData = booking.parent_profiles;
        const parentProfile = parentData.profiles;
        let stripeCustomerId = parentData.stripe_customer_id;
        if (!stripeCustomerId) {
            const customer = await this.stripeService.createCustomer(parentProfile.email, `${parentProfile.first_name} ${parentProfile.last_name}`, { parent_profile_id: booking.parent_profile_id });
            stripeCustomerId = customer.id;
            await supabase
                .from('parent_profiles')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('id', booking.parent_profile_id);
        }
        const applicationFee = booking.platform_commission_cents + (booking.mileage_fee_cents || 0);
        const REUSABLE_STATUSES = new Set([
            'requires_payment_method',
            'requires_confirmation',
            'requires_action',
        ]);
        const { data: existingPayment } = await supabase
            .from('payments')
            .select('stripe_payment_intent_id, amount_cents')
            .eq('booking_id', bookingId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (existingPayment?.stripe_payment_intent_id) {
            const existingIntent = await this.stripeService.retrievePaymentIntent(existingPayment.stripe_payment_intent_id);
            if (existingIntent &&
                REUSABLE_STATUSES.has(existingIntent.status) &&
                existingIntent.amount === booking.total_amount_cents) {
                this.logger.log(`Reusing PaymentIntent ${existingIntent.id} for booking ${bookingId} (status=${existingIntent.status})`);
                return {
                    client_secret: existingIntent.client_secret,
                    payment_intent_id: existingIntent.id,
                    amount_cents: booking.total_amount_cents,
                    currency: 'cad',
                };
            }
        }
        const paymentIntent = await this.stripeService.createPaymentIntent({
            amountCents: booking.total_amount_cents,
            customerStripeId: stripeCustomerId,
            educatorStripeAccountId: educatorStripeId,
            applicationFeeAmountCents: applicationFee,
            metadata: {
                booking_id: bookingId,
                parent_profile_id: booking.parent_profile_id,
                educator_profile_id: booking.educator_profile_id,
                subtotal_cents: String(booking.subtotal_cents),
                commission_cents: String(booking.platform_commission_cents),
                mileage_fee_cents: String(booking.mileage_fee_cents || 0),
            },
        });
        await supabase.from('payments').insert({
            booking_id: bookingId,
            stripe_payment_intent_id: paymentIntent.id,
            amount_cents: booking.total_amount_cents,
            currency: 'CAD',
            status: 'pending',
            metadata: {
                application_fee_amount: applicationFee,
                educator_stripe_account_id: educatorStripeId,
            },
        });
        return {
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
            amount_cents: booking.total_amount_cents,
            currency: 'cad',
        };
    }
    async handleWebhook(rawBody, signature) {
        const webhookSecret = this.configService.get('stripe.webhookSecret');
        let event;
        try {
            event = this.stripeService.constructWebhookEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            throw new common_1.BadRequestException('Signature de webhook invalide');
        }
        this.logger.log(`Webhook received: ${event.type} (${event.id})`);
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSuccess(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;
            case 'account.updated':
                await this.handleAccountUpdated(event.data.object);
                break;
            case 'charge.refunded':
                await this.handleChargeRefunded(event.data.object);
                break;
            case 'transfer.created':
                await this.handleTransferCreated(event.data.object);
                break;
            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }
        return { received: true };
    }
    async processRefund(bookingId, amountCents) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: payment } = await supabase
            .from('payments')
            .select('stripe_payment_intent_id, status, amount_cents')
            .eq('booking_id', bookingId)
            .eq('status', 'completed')
            .single();
        if (!payment) {
            throw new common_1.NotFoundException('Aucun paiement complété pour cette réservation');
        }
        const refund = await this.stripeService.createRefund(payment.stripe_payment_intent_id, amountCents);
        return {
            refund_id: refund.id,
            amount_refunded: refund.amount,
            status: refund.status,
        };
    }
    async handlePaymentSuccess(paymentIntent) {
        const supabase = this.supabaseService.getServiceClient();
        const bookingId = paymentIntent.metadata?.booking_id;
        if (!bookingId) {
            this.logger.warn('PaymentIntent succeeded without booking_id in metadata');
            return;
        }
        await supabase
            .from('payments')
            .update({
            status: 'completed',
            stripe_charge_id: paymentIntent.latest_charge,
            payment_method: paymentIntent.payment_method_types?.[0] || 'card',
        })
            .eq('stripe_payment_intent_id', paymentIntent.id);
        await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', bookingId)
            .eq('status', 'pending_payment');
        const { data: booking } = await supabase
            .from('bookings')
            .select('parent_profile_id, educator_profile_id, booking_date_start, educator_profiles(profile_id), parent_profiles(profile_id)')
            .eq('id', bookingId)
            .single();
        if (booking) {
            const edProfileId = booking.educator_profiles?.profile_id;
            const parentProfileId = booking.parent_profiles?.profile_id;
            if (edProfileId) {
                await this.notificationsService.create({
                    profile_id: edProfileId,
                    notification_type: 'booking_confirmed',
                    title: 'Nouvelle réservation confirmée',
                    message: `Une réservation a été confirmée pour le ${new Date(booking.booking_date_start).toLocaleDateString('fr-CA')}.`,
                    related_booking_id: bookingId,
                });
            }
            if (parentProfileId) {
                await this.notificationsService.create({
                    profile_id: parentProfileId,
                    notification_type: 'payment_received',
                    title: 'Réservation confirmée',
                    message: 'Votre paiement a été confirmé et la réservation est active.',
                    related_booking_id: bookingId,
                });
            }
        }
        this.logger.log(`Booking ${bookingId} confirmed via payment ${paymentIntent.id}`);
    }
    async handlePaymentFailed(paymentIntent) {
        const supabase = this.supabaseService.getServiceClient();
        await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('stripe_payment_intent_id', paymentIntent.id);
        this.logger.warn(`Payment failed for booking ${paymentIntent.metadata?.booking_id}: ${paymentIntent.last_payment_error?.message}`);
    }
    async handleAccountUpdated(account) {
        const supabase = this.supabaseService.getServiceClient();
        const newStatus = account.charges_enabled ? 'active' : 'pending';
        const bankingVerified = account.charges_enabled && account.payouts_enabled;
        await supabase
            .from('educator_profiles')
            .update({
            stripe_account_status: newStatus,
            banking_details_verified: bankingVerified,
        })
            .eq('stripe_account_id', account.id);
        this.logger.log(`Stripe account ${account.id} updated: status=${newStatus}`);
    }
    async handleChargeRefunded(charge) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: payment } = await supabase
            .from('payments')
            .select('id, booking_id')
            .eq('stripe_charge_id', charge.id)
            .single();
        if (!payment) {
            this.logger.warn(`Charge refunded but no payment found for charge ${charge.id}`);
            return;
        }
        const isFullRefund = charge.amount_refunded === charge.amount;
        if (isFullRefund) {
            await supabase
                .from('payments')
                .update({ status: 'refunded' })
                .eq('id', payment.id);
            await supabase
                .from('bookings')
                .update({
                status: 'refunded',
                refund_amount_cents: charge.amount_refunded,
                refunded_at: new Date().toISOString(),
            })
                .eq('id', payment.booking_id);
        }
        else {
            await supabase
                .from('bookings')
                .update({ refund_amount_cents: charge.amount_refunded })
                .eq('id', payment.booking_id);
        }
        this.logger.log(`Charge ${charge.id} refunded: ${charge.amount_refunded}/${charge.amount} cents`);
    }
    async handleTransferCreated(transfer) {
        const supabase = this.supabaseService.getServiceClient();
        if (transfer.destination && transfer.source_transaction) {
            const { data: payment } = await supabase
                .from('payments')
                .select('booking_id')
                .eq('stripe_charge_id', transfer.source_transaction)
                .single();
            if (payment) {
                await supabase
                    .from('payouts')
                    .update({ stripe_payout_id: transfer.id })
                    .eq('booking_id', payment.booking_id);
            }
        }
        this.logger.log(`Transfer ${transfer.id} created: ${transfer.amount} cents to ${transfer.destination}`);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [stripe_service_1.StripeService,
        config_1.ConfigService,
        supabase_service_1.SupabaseService,
        notifications_service_1.NotificationsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map