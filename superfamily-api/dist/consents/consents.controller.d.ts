import { Request } from 'express';
import { ConsentsService } from './consents.service';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class ConsentsController {
    private readonly consentsService;
    constructor(consentsService: ConsentsService);
    required(user: AuthUser): Promise<import("./consents.service").RequiredConsent[]>;
    accept(user: AuthUser, dto: AcceptConsentDto, req: Request): Promise<{
        success: boolean;
    }>;
    history(user: AuthUser): Promise<import("./consents.service").ConsentHistoryRow[]>;
    revoke(user: AuthUser, type: string, req: Request): Promise<{
        success: boolean;
    }>;
    policy(type: string, version?: string): Promise<import("./consents.service").PolicyVersionRow>;
    private extractRequestContext;
}
