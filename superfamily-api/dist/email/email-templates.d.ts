export interface EmailChrome {
    logoUrl: string;
    homepageUrl: string;
    fromName: string;
}
export declare function signupVerificationEmail(chrome: EmailChrome, params: {
    firstName?: string;
    code: string;
    expiresInMinutes: number;
}): string;
export declare function passwordResetEmail(chrome: EmailChrome, params: {
    firstName?: string;
    code: string;
    expiresInMinutes: number;
}): string;
export declare function emailChangeEmail(chrome: EmailChrome, params: {
    firstName?: string;
    code: string;
    expiresInMinutes: number;
    newEmail: string;
}): string;
export declare function emailChangeNoticeEmail(chrome: EmailChrome, params: {
    firstName?: string;
    newEmail: string;
}): string;
