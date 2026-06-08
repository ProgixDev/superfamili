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
var SupabaseAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
const allow_no_profile_decorator_1 = require("../decorators/allow-no-profile.decorator");
const supabase_service_1 = require("../../supabase/supabase.service");
let SupabaseAuthGuard = SupabaseAuthGuard_1 = class SupabaseAuthGuard {
    reflector;
    supabaseService;
    logger = new common_1.Logger(SupabaseAuthGuard_1.name);
    constructor(reflector, supabaseService) {
        this.reflector = reflector;
        this.supabaseService = supabaseService;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const allowNoProfile = this.reflector.getAllAndOverride(allow_no_profile_decorator_1.ALLOW_NO_PROFILE_KEY, [context.getHandler(), context.getClass()]);
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException("Jeton d'authentification manquant");
        }
        const token = authHeader.replace('Bearer ', '');
        try {
            const supabase = this.supabaseService.getAnonClient();
            const { data: { user }, error, } = await supabase.auth.getUser(token);
            if (error || !user) {
                throw new common_1.UnauthorizedException('Jeton invalide ou expiré');
            }
            const serviceClient = this.supabaseService.getServiceClient();
            const { data: profile, error: profileError } = await serviceClient
                .from('profiles')
                .select('id, role')
                .eq('user_id', user.id)
                .maybeSingle();
            if (profileError) {
                this.logger.error(`Profile lookup failed for user ${user.id}: ${profileError.message}`);
                throw new common_1.UnauthorizedException('Impossible de vérifier votre profil. Veuillez réessayer.');
            }
            if (!profile && !allowNoProfile) {
                throw new common_1.UnauthorizedException('Aucun profil associé à ce compte. Veuillez compléter votre inscription.');
            }
            const authUser = {
                userId: user.id,
                email: user.email,
                role: profile?.role,
                profileId: profile?.id,
            };
            request.user = authUser;
            return true;
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.UnauthorizedException('Jeton invalide ou expiré');
        }
    }
};
exports.SupabaseAuthGuard = SupabaseAuthGuard;
exports.SupabaseAuthGuard = SupabaseAuthGuard = SupabaseAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        supabase_service_1.SupabaseService])
], SupabaseAuthGuard);
//# sourceMappingURL=supabase-auth.guard.js.map