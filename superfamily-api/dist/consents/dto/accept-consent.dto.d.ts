export declare const CONSENT_TYPES: readonly ["terms_of_use", "privacy_policy", "kyc_verification", "reference_contact", "background_check_storage", "marketing_emails"];
export type ConsentType = (typeof CONSENT_TYPES)[number];
export declare class AcceptConsentDto {
    consent_type: ConsentType;
    version: string;
    accepted: boolean;
}
