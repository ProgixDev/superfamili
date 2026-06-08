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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const email_service_1 = require("../email/email.service");
const otp_service_1 = require("./otp.service");
let AuthService = AuthService_1 = class AuthService {
    supabaseService;
    emailService;
    otpService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(supabaseService, emailService, otpService) {
        this.supabaseService = supabaseService;
        this.emailService = emailService;
        this.otpService = otpService;
    }
    async signup(userId, email, dto) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .single();
        if (existing) {
            throw new common_1.ConflictException('Un profil existe déjà pour cet utilisateur');
        }
        let locationData = {};
        let resolvedCity = dto.city || undefined;
        if (dto.postal_code) {
            const { data: postalData } = await supabase
                .from('postal_codes')
                .select('latitude, longitude, city')
                .eq('postal_code', dto.postal_code)
                .single();
            if (postalData) {
                locationData = {
                    latitude: postalData.latitude,
                    longitude: postalData.longitude,
                    location_point: `POINT(${postalData.longitude} ${postalData.latitude})`,
                };
                if (!resolvedCity)
                    resolvedCity = postalData.city;
            }
        }
        else if (dto.city) {
            const { data: cityData } = await supabase
                .from('cities')
                .select('latitude, longitude, name')
                .ilike('name', dto.city)
                .limit(1)
                .single();
            if (cityData) {
                locationData = {
                    latitude: cityData.latitude,
                    longitude: cityData.longitude,
                    location_point: `POINT(${cityData.longitude} ${cityData.latitude})`,
                };
                resolvedCity = cityData.name;
            }
        }
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
            user_id: userId,
            role: dto.role,
            first_name: dto.first_name,
            last_name: dto.last_name,
            email: email,
            phone: dto.phone,
            postal_code: dto.postal_code,
            city: resolvedCity,
            ...locationData,
        })
            .select()
            .single();
        if (profileError) {
            throw new common_1.InternalServerErrorException('Erreur lors de la création du profil');
        }
        if (dto.role === 'parent') {
            await supabase.from('parent_profiles').insert({ profile_id: profile.id });
        }
        else if (dto.role === 'educator') {
            await supabase
                .from('educator_profiles')
                .insert({ profile_id: profile.id });
        }
        return {
            id: profile.id,
            user_id: userId,
            email: email,
            role: dto.role,
            first_name: dto.first_name,
            last_name: dto.last_name,
        };
    }
    async getMe(userId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error || !profile) {
            throw new common_1.BadRequestException('Profil non trouvé');
        }
        let roleProfile = null;
        if (profile.role === 'parent') {
            const { data } = await supabase
                .from('parent_profiles')
                .select('*, children(*)')
                .eq('profile_id', profile.id)
                .single();
            roleProfile = data;
        }
        else if (profile.role === 'educator') {
            const { data } = await supabase
                .from('educator_profiles')
                .select('*, educator_services(*, services(*))')
                .eq('profile_id', profile.id)
                .single();
            roleProfile = data;
        }
        return {
            ...profile,
            role_profile: roleProfile,
        };
    }
    async signupInit(params) {
        const lowered = params.email.toLowerCase();
        const supabase = this.supabaseService.getServiceClient();
        const existing = await this.findAuthUserByEmail(lowered);
        if (existing?.email_confirmed_at) {
            throw new common_1.ConflictException('Cette adresse courriel est déjà utilisée. Connectez-vous plutôt.');
        }
        if (existing && !existing.email_confirmed_at) {
            const { error: passError } = await supabase.auth.admin.updateUserById(existing.id, {
                password: params.password,
                user_metadata: {
                    first_name: params.first_name,
                    last_name: params.last_name ?? '',
                },
            });
            if (passError) {
                this.logger.error(`signupInit: update existing unconfirmed user failed: ${passError.message}`);
                throw new common_1.InternalServerErrorException("Impossible d'enregistrer le compte pour le moment");
            }
        }
        else {
            const { error: createError } = await supabase.auth.admin.createUser({
                email: lowered,
                password: params.password,
                email_confirm: false,
                user_metadata: {
                    first_name: params.first_name,
                    last_name: params.last_name ?? '',
                },
            });
            if (createError) {
                const msg = createError.message || '';
                if (/already/i.test(msg)) {
                    throw new common_1.ConflictException('Cette adresse courriel est déjà utilisée.');
                }
                this.logger.error(`signupInit: createUser failed: ${msg}`);
                throw new common_1.InternalServerErrorException('Impossible de créer le compte pour le moment');
            }
        }
        await this.sendSignupVerification(lowered, params.first_name);
        return { sent: true };
    }
    async sendSignupVerification(email, firstName) {
        const lowered = email.toLowerCase();
        const supabase = this.supabaseService.getServiceClient();
        const authUser = await this.findAuthUserByEmail(lowered);
        if (authUser?.email_confirmed_at) {
            return { sent: true };
        }
        const { code, expiresInMinutes } = await this.otpService.issue({
            email: lowered,
            purpose: 'signup_verification',
            userId: authUser?.id ?? null,
        });
        try {
            await this.emailService.sendSignupVerification(lowered, {
                firstName,
                code,
                expiresInMinutes,
            });
        }
        catch (err) {
            this.logger.error(`sendSignupVerification: email failed for ${lowered}: ${err.message}`);
            throw new common_1.InternalServerErrorException("Impossible d'envoyer le courriel de vérification");
        }
        void supabase;
        return { sent: true };
    }
    async verifyEmail(email, code) {
        const lowered = email.toLowerCase();
        const verified = await this.otpService.verify({
            email: lowered,
            code,
            purpose: 'signup_verification',
        });
        const userId = verified.userId;
        if (!userId) {
            throw new common_1.BadRequestException('Compte introuvable');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
        if (updateError) {
            this.logger.error(`verifyEmail: failed to confirm user ${userId}: ${updateError.message}`);
            throw new common_1.InternalServerErrorException("Impossible de confirmer l'adresse courriel");
        }
        const session = await this.mintSession(lowered);
        return session;
    }
    async forgotPassword(email) {
        const lowered = email.toLowerCase();
        const authUser = await this.findAuthUserByEmail(lowered);
        if (!authUser) {
            this.logger.log(`forgotPassword: no user for ${lowered} (silent)`);
            return { sent: true };
        }
        const profile = await this.findProfileByUserId(authUser.id);
        const { code, expiresInMinutes } = await this.otpService.issue({
            email: lowered,
            purpose: 'password_reset',
            userId: authUser.id,
        });
        try {
            await this.emailService.sendPasswordReset(lowered, {
                firstName: profile?.first_name,
                code,
                expiresInMinutes,
            });
        }
        catch (err) {
            this.logger.error(`forgotPassword: email failed for ${lowered}: ${err.message}`);
        }
        return { sent: true };
    }
    async resetPassword(email, code, newPassword) {
        const lowered = email.toLowerCase();
        const verified = await this.otpService.verify({
            email: lowered,
            code,
            purpose: 'password_reset',
        });
        if (!verified.userId) {
            throw new common_1.BadRequestException('Code invalide ou expiré');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase.auth.admin.updateUserById(verified.userId, {
            password: newPassword,
        });
        if (error) {
            this.logger.error(`resetPassword: failed to update user ${verified.userId}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Impossible de mettre à jour le mot de passe');
        }
        return { success: true };
    }
    async requestEmailChange(userId, currentEmail, newEmail) {
        const newLower = newEmail.toLowerCase();
        if (newLower === currentEmail.toLowerCase()) {
            throw new common_1.BadRequestException("La nouvelle adresse doit être différente de l'adresse actuelle");
        }
        const existing = await this.findAuthUserByEmail(newLower);
        if (existing && existing.id !== userId) {
            throw new common_1.ConflictException('Cette adresse courriel est déjà utilisée');
        }
        const profile = await this.findProfileByUserId(userId);
        const { code, expiresInMinutes } = await this.otpService.issue({
            email: newLower,
            purpose: 'email_change',
            userId,
            metadata: { previous_email: currentEmail.toLowerCase() },
        });
        try {
            await this.emailService.sendEmailChangeConfirmation(newLower, {
                firstName: profile?.first_name,
                code,
                expiresInMinutes,
                newEmail: newLower,
            });
        }
        catch (err) {
            this.logger.error(`requestEmailChange: email failed for ${newLower}: ${err.message}`);
            throw new common_1.InternalServerErrorException("Impossible d'envoyer le courriel de confirmation");
        }
        return { sent: true };
    }
    async confirmEmailChange(userId, newEmail, code) {
        const newLower = newEmail.toLowerCase();
        const verified = await this.otpService.verify({
            email: newLower,
            code,
            purpose: 'email_change',
        });
        if (verified.userId && verified.userId !== userId) {
            throw new common_1.BadRequestException('Code invalide ou expiré');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, { email: newLower, email_confirm: true });
        if (authError) {
            this.logger.error(`confirmEmailChange: auth update failed for ${userId}: ${authError.message}`);
            throw new common_1.InternalServerErrorException("Impossible de mettre à jour l'adresse courriel");
        }
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ email: newLower })
            .eq('user_id', userId);
        if (profileError) {
            this.logger.error(`confirmEmailChange: profile update failed for ${userId}: ${profileError.message}`);
        }
        const previousEmail = verified.metadata?.previous_email || null;
        if (previousEmail) {
            const profile = await this.findProfileByUserId(userId);
            try {
                await this.emailService.sendEmailChangeNotice(previousEmail, {
                    firstName: profile?.first_name,
                    newEmail: newLower,
                });
            }
            catch (err) {
                this.logger.warn(`confirmEmailChange: notice email to ${previousEmail} failed: ${err.message}`);
            }
        }
        return { success: true, email: newLower };
    }
    async findAuthUserByEmail(email) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase.rpc('find_auth_user_by_email', {
            p_email: email,
        });
        if (error) {
            this.logger.error(`findAuthUserByEmail: RPC failed: ${error.message}`);
            return null;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row)
            return null;
        return row;
    }
    async findProfileByUserId(userId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', userId)
            .maybeSingle();
        return data;
    }
    async mintSession(email) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email,
        });
        if (error || !data?.properties?.hashed_token) {
            this.logger.error(`mintSession: generateLink failed: ${error?.message ?? 'no token'}`);
            throw new common_1.InternalServerErrorException('Impossible de créer une session pour cet utilisateur');
        }
        const anon = this.supabaseService.getAnonClient();
        const { data: sessionData, error: otpError } = await anon.auth.verifyOtp({
            type: 'magiclink',
            token_hash: data.properties.hashed_token,
        });
        if (otpError || !sessionData.session) {
            this.logger.error(`mintSession: verifyOtp failed: ${otpError?.message ?? 'no session'}`);
            throw new common_1.InternalServerErrorException('Impossible de créer une session pour cet utilisateur');
        }
        return {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        email_service_1.EmailService,
        otp_service_1.OtpService])
], AuthService);
//# sourceMappingURL=auth.service.js.map