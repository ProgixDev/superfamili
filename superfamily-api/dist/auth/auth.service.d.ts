import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { OtpService } from './otp.service';
import { SignupDto } from './dto/signup.dto';
export declare class AuthService {
    private readonly supabaseService;
    private readonly emailService;
    private readonly otpService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, emailService: EmailService, otpService: OtpService);
    signup(userId: string, email: string, dto: SignupDto): Promise<{
        id: any;
        user_id: string;
        email: string;
        role: "parent" | "educator" | "admin";
        first_name: string;
        last_name: string;
    }>;
    getMe(userId: string): Promise<any>;
    signupInit(params: {
        email: string;
        password: string;
        first_name: string;
        last_name?: string;
    }): Promise<{
        sent: boolean;
    }>;
    sendSignupVerification(email: string, firstName?: string): Promise<{
        sent: boolean;
    }>;
    verifyEmail(email: string, code: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    forgotPassword(email: string): Promise<{
        sent: boolean;
    }>;
    resetPassword(email: string, code: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    requestEmailChange(userId: string, currentEmail: string, newEmail: string): Promise<{
        sent: boolean;
    }>;
    confirmEmailChange(userId: string, newEmail: string, code: string): Promise<{
        success: boolean;
        email: string;
    }>;
    private findAuthUserByEmail;
    private findProfileByUserId;
    private mintSession;
}
