import { SupabaseService } from '../supabase/supabase.service';
export type OtpPurpose = 'signup_verification' | 'password_reset' | 'email_change';
interface IssueOtpParams {
    email: string;
    purpose: OtpPurpose;
    userId?: string | null;
    metadata?: Record<string, unknown>;
}
interface VerifyOtpParams {
    email: string;
    purpose: OtpPurpose;
    code: string;
}
export interface VerifiedOtp {
    id: string;
    userId: string | null;
    email: string;
    metadata: Record<string, unknown>;
}
export declare class OtpService {
    private readonly supabaseService;
    private readonly logger;
    private static readonly EXPIRY_MINUTES;
    private static readonly MAX_ATTEMPTS;
    constructor(supabaseService: SupabaseService);
    issue(params: IssueOtpParams): Promise<{
        code: string;
        expiresInMinutes: number;
    }>;
    verify(params: VerifyOtpParams): Promise<VerifiedOtp>;
    private generateCode;
    private hash;
    private constantTimeEqual;
}
export {};
