import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SendVerificationOtpDto } from './dto/send-verification-otp.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { SignupInitDto } from './dto/signup-init.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(user: AuthUser, dto: SignupDto): Promise<{
        id: any;
        user_id: string;
        email: string;
        role: "parent" | "educator" | "admin";
        first_name: string;
        last_name: string;
    }>;
    getMe(user: AuthUser): Promise<any>;
    signupInit(dto: SignupInitDto): Promise<{
        sent: boolean;
    }>;
    sendVerificationOtp(dto: SendVerificationOtpDto): Promise<{
        sent: boolean;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        sent: boolean;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
    }>;
    requestEmailChange(user: AuthUser, dto: RequestEmailChangeDto): Promise<{
        sent: boolean;
    }>;
    confirmEmailChange(user: AuthUser, dto: ConfirmEmailChangeDto): Promise<{
        success: boolean;
        email: string;
    }>;
}
