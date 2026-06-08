export declare class DiditSignatureVerifier {
    private readonly logger;
    verify(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, secret: string, toleranceSeconds: number): boolean;
    private verifyV2;
    private verifySimple;
    private verifyLegacy;
    private constantTimeEquals;
    private sortKeys;
    private shortenFloats;
    private firstHeader;
}
