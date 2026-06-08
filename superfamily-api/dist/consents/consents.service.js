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
var ConsentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSENT_TYPES = exports.ConsentsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const accept_consent_dto_1 = require("./dto/accept-consent.dto");
Object.defineProperty(exports, "CONSENT_TYPES", { enumerable: true, get: function () { return accept_consent_dto_1.CONSENT_TYPES; } });
const ALWAYS_REQUIRED_CONSENTS = [
    'terms_of_use',
    'privacy_policy',
];
const EDUCATOR_ONLY_CONSENTS = [
    'kyc_verification',
    'reference_contact',
    'background_check_storage',
];
const OPTIONAL_CONSENTS = ['marketing_emails'];
let ConsentsService = ConsentsService_1 = class ConsentsService {
    supabaseService;
    logger = new common_1.Logger(ConsentsService_1.name);
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getRequired(profileId, role) {
        if (!profileId) {
            throw new common_1.ForbiddenException('Profil utilisateur introuvable.');
        }
        const applicable = this.applicableConsentTypes(role);
        const currentVersions = await this.loadCurrentVersions();
        const userAccepted = await this.loadUserAcceptedMap(profileId);
        const out = [];
        for (const type of applicable) {
            const current = currentVersions.get(type);
            if (!current) {
                this.logger.warn(`No current policy_version for ${type} — skipping in required list`);
                continue;
            }
            const acceptedVersion = userAccepted.get(type);
            const alreadyAccepted = acceptedVersion === current.version;
            out.push({
                consent_type: type,
                version: current.version,
                required: !OPTIONAL_CONSENTS.includes(type),
                already_accepted: alreadyAccepted,
            });
        }
        return out;
    }
    async hasValidConsent(profileId, type) {
        if (!profileId)
            return false;
        const current = await this.getCurrentVersion(type);
        if (!current)
            return false;
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('user_consents')
            .select('id')
            .eq('user_id', profileId)
            .eq('consent_type', type)
            .eq('version', current.version)
            .eq('accepted', true)
            .is('revoked_at', null)
            .maybeSingle();
        if (error) {
            this.logger.error(`hasValidConsent query failed for ${profileId}/${type}: ${error.message}`);
            return false;
        }
        return !!data;
    }
    async requireConsent(profileId, type) {
        const ok = await this.hasValidConsent(profileId, type);
        if (!ok) {
            throw new common_1.ForbiddenException(`Ce consentement est requis avant de continuer : ${this.typeLabel(type)}.`);
        }
    }
    async accept(profileId, dto, context) {
        if (!profileId) {
            throw new common_1.ForbiddenException('Profil utilisateur introuvable.');
        }
        const current = await this.getCurrentVersion(dto.consent_type);
        if (!current) {
            throw new common_1.NotFoundException(`Aucune version publiée pour ce consentement : ${dto.consent_type}.`);
        }
        if (current.version !== dto.version) {
            throw new common_1.BadRequestException(`Version obsolète. Version actuelle : ${current.version}.`);
        }
        const isOptional = OPTIONAL_CONSENTS.includes(dto.consent_type);
        if (!isOptional && !dto.accepted) {
            throw new common_1.BadRequestException('Ce consentement est obligatoire. Vous ne pouvez pas le refuser via cet endpoint.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase.from('user_consents').upsert({
            user_id: profileId,
            consent_type: dto.consent_type,
            version: dto.version,
            accepted: dto.accepted,
            accepted_at: new Date().toISOString(),
            ip_address: context.ip,
            user_agent: context.userAgent,
            revoked_at: null,
            revoked_ip: null,
            revoked_user_agent: null,
        }, { onConflict: 'user_id,consent_type,version' });
        if (error) {
            this.logger.error(`consent accept failed for ${profileId}/${dto.consent_type}: ${error.message}`);
            throw new common_1.InternalServerErrorException("Erreur lors de l'enregistrement du consentement.");
        }
    }
    async revoke(profileId, type, context) {
        if (!profileId) {
            throw new common_1.ForbiddenException('Profil utilisateur introuvable.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { error } = await supabase
            .from('user_consents')
            .update({
            revoked_at: new Date().toISOString(),
            revoked_ip: context.ip,
            revoked_user_agent: context.userAgent,
        })
            .eq('user_id', profileId)
            .eq('consent_type', type)
            .is('revoked_at', null);
        if (error) {
            this.logger.error(`consent revoke failed for ${profileId}/${type}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la révocation du consentement.');
        }
    }
    async getHistory(profileId) {
        if (!profileId) {
            throw new common_1.ForbiddenException('Profil utilisateur introuvable.');
        }
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('user_consents')
            .select('id, consent_type, version, accepted, accepted_at, revoked_at, ip_address, user_agent')
            .eq('user_id', profileId)
            .order('accepted_at', { ascending: false });
        if (error) {
            this.logger.error(`consent history failed for ${profileId}: ${error.message}`);
            throw new common_1.InternalServerErrorException("Erreur lors de la récupération de l'historique des consentements.");
        }
        return (data ?? []);
    }
    async getPolicyContent(type, version) {
        const supabase = this.supabaseService.getServiceClient();
        if (!version) {
            const current = await this.getCurrentVersion(type);
            if (!current) {
                throw new common_1.NotFoundException(`Aucune version publiée pour ce type : ${type}.`);
            }
            return current;
        }
        const { data, error } = await supabase
            .from('policy_versions')
            .select('*')
            .eq('consent_type', type)
            .eq('version', version)
            .maybeSingle();
        if (error) {
            this.logger.error(`policy version lookup failed for ${type}@${version}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Erreur lors de la récupération de la politique.');
        }
        if (!data) {
            throw new common_1.NotFoundException(`Version introuvable : ${type}@${version}.`);
        }
        return data;
    }
    applicableConsentTypes(role) {
        const base = [...ALWAYS_REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS];
        if (role === 'educator') {
            return [
                ...ALWAYS_REQUIRED_CONSENTS,
                ...EDUCATOR_ONLY_CONSENTS,
                ...OPTIONAL_CONSENTS,
            ];
        }
        return base;
    }
    async loadCurrentVersions() {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('policy_versions')
            .select('*')
            .order('effective_date', { ascending: false });
        if (error) {
            this.logger.error(`policy_versions list failed: ${error.message}`);
            return new Map();
        }
        const map = new Map();
        for (const row of (data ?? [])) {
            if (!map.has(row.consent_type)) {
                map.set(row.consent_type, row);
            }
        }
        return map;
    }
    async getCurrentVersion(type) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('policy_versions')
            .select('*')
            .eq('consent_type', type)
            .order('effective_date', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error || !data)
            return null;
        return data;
    }
    async loadUserAcceptedMap(profileId) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('user_consents')
            .select('consent_type, version, accepted_at')
            .eq('user_id', profileId)
            .eq('accepted', true)
            .is('revoked_at', null)
            .order('accepted_at', { ascending: false });
        if (error) {
            this.logger.error(`loadUserAcceptedMap failed for ${profileId}: ${error.message}`);
            return new Map();
        }
        const map = new Map();
        for (const row of (data ?? [])) {
            if (!map.has(row.consent_type)) {
                map.set(row.consent_type, row.version);
            }
        }
        return map;
    }
    typeLabel(type) {
        switch (type) {
            case 'terms_of_use':
                return "conditions d'utilisation";
            case 'privacy_policy':
                return 'politique de confidentialité';
            case 'kyc_verification':
                return "vérification d'identité";
            case 'reference_contact':
                return 'contact des références';
            case 'background_check_storage':
                return 'stockage des antécédents judiciaires';
            case 'marketing_emails':
                return 'communications marketing';
            default:
                return type;
        }
    }
};
exports.ConsentsService = ConsentsService;
exports.ConsentsService = ConsentsService = ConsentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ConsentsService);
//# sourceMappingURL=consents.service.js.map