import { KycService } from './kyc.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class KycController {
    private readonly kycService;
    constructor(kycService: KycService);
    startSession(user: AuthUser, _dto: CreateSessionDto): Promise<{
        session_id: string;
        verification_url: string;
        expires_at: string | null;
    }>;
    getStatus(user: AuthUser): Promise<import("./kyc.service").KycStatusResponse>;
    getLatest(user: AuthUser): Promise<import("./kyc.service").KycVerification>;
}
