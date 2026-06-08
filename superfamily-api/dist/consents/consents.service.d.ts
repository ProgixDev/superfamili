import { SupabaseService } from '../supabase/supabase.service';
import { AcceptConsentDto, ConsentType, CONSENT_TYPES } from './dto/accept-consent.dto';
export interface RequiredConsent {
    consent_type: ConsentType;
    version: string;
    required: boolean;
    already_accepted: boolean;
}
export interface ConsentHistoryRow {
    id: string;
    consent_type: ConsentType;
    version: string;
    accepted: boolean;
    accepted_at: string;
    revoked_at: string | null;
    ip_address: string | null;
    user_agent: string | null;
}
export interface PolicyVersionRow {
    id: string;
    consent_type: ConsentType;
    version: string;
    effective_date: string;
    content_md: string;
}
export declare class ConsentsService {
    private readonly supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    getRequired(profileId: string, role: string): Promise<RequiredConsent[]>;
    hasValidConsent(profileId: string, type: ConsentType): Promise<boolean>;
    requireConsent(profileId: string, type: ConsentType): Promise<void>;
    accept(profileId: string, dto: AcceptConsentDto, context: {
        ip: string | null;
        userAgent: string | null;
    }): Promise<void>;
    revoke(profileId: string, type: ConsentType, context: {
        ip: string | null;
        userAgent: string | null;
    }): Promise<void>;
    getHistory(profileId: string): Promise<ConsentHistoryRow[]>;
    getPolicyContent(type: ConsentType, version?: string): Promise<PolicyVersionRow>;
    private applicableConsentTypes;
    private loadCurrentVersions;
    private getCurrentVersion;
    private loadUserAcceptedMap;
    private typeLabel;
}
export { CONSENT_TYPES, ConsentType };
