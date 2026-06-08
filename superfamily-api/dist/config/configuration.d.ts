declare const _default: () => {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    publicBaseUrl: string;
    corsOrigins: string[];
    supabase: {
        url: string | undefined;
        anonKey: string | undefined;
        serviceRoleKey: string | undefined;
        jwtSecret: string | undefined;
    };
    stripe: {
        secretKey: string | undefined;
        webhookSecret: string | undefined;
        platformAccountId: string | undefined;
    };
    didit: {
        baseUrl: string;
        apiKey: string | undefined;
        workflowId: string | undefined;
        webhookSecret: string | undefined;
        webhookTimestampToleranceSeconds: number;
        minConfidenceScore: number;
    };
    email: {
        smtp: {
            host: string | undefined;
            port: number;
            secure: boolean;
            user: string | undefined;
            password: string | undefined;
        };
        fromName: string;
        fromAddress: string | undefined;
        logoUrl: string;
        homepageUrl: string;
    };
};
export default _default;
