import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { KycService } from './kyc.service';
export declare class KycWebhookController {
    private readonly kycService;
    private readonly logger;
    constructor(kycService: KycService);
    handleDiditWebhook(req: RawBodyRequest<Request>, headers: Record<string, string | string[] | undefined>): Promise<{
        received: true;
    }>;
}
