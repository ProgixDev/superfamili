"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    publicBaseUrl: (() => {
        if (process.env.PUBLIC_BASE_URL)
            return process.env.PUBLIC_BASE_URL;
        if (process.env.BACKEND_PUBLIC_URL)
            return process.env.BACKEND_PUBLIC_URL;
        if (process.env.RAILWAY_PUBLIC_DOMAIN) {
            return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
        }
        return `http://localhost:${parseInt(process.env.PORT || '3001', 10)}`;
    })(),
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecret: process.env.SUPABASE_JWT_SECRET,
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        platformAccountId: process.env.STRIPE_PLATFORM_ACCOUNT_ID,
    },
    didit: {
        baseUrl: process.env.DIDIT_BASE_URL || 'https://verification.didit.me',
        apiKey: process.env.DIDIT_API_KEY,
        workflowId: process.env.DIDIT_WORKFLOW_ID,
        webhookSecret: process.env.DIDIT_WEBHOOK_SECRET,
        webhookTimestampToleranceSeconds: parseInt(process.env.DIDIT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS || '300', 10),
        minConfidenceScore: parseInt(process.env.DIDIT_MIN_CONFIDENCE_SCORE || '70', 10),
    },
    email: {
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER,
            password: process.env.SMTP_PASSWORD,
        },
        fromName: process.env.EMAIL_FROM_NAME || 'SuperFamili',
        fromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER,
        logoUrl: process.env.EMAIL_LOGO_URL || 'https://superfamili.ca/images/logo.png',
        homepageUrl: process.env.EMAIL_HOMEPAGE_URL || 'https://superfamili.ca',
    },
});
//# sourceMappingURL=configuration.js.map