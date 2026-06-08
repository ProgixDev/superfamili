import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class EmailService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private transporter;
    constructor(config: ConfigService);
    onModuleInit(): void;
    private chrome;
    private send;
    sendSignupVerification(to: string, params: {
        firstName?: string;
        code: string;
        expiresInMinutes: number;
    }): Promise<void>;
    sendPasswordReset(to: string, params: {
        firstName?: string;
        code: string;
        expiresInMinutes: number;
    }): Promise<void>;
    sendEmailChangeConfirmation(to: string, params: {
        firstName?: string;
        code: string;
        expiresInMinutes: number;
        newEmail: string;
    }): Promise<void>;
    sendEmailChangeNotice(to: string, params: {
        firstName?: string;
        newEmail: string;
    }): Promise<void>;
}
