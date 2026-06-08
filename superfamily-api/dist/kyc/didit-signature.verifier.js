"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DiditSignatureVerifier_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiditSignatureVerifier = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
let DiditSignatureVerifier = DiditSignatureVerifier_1 = class DiditSignatureVerifier {
    logger = new common_1.Logger(DiditSignatureVerifier_1.name);
    verify(rawBody, headers, secret, toleranceSeconds) {
        if (!secret || secret.length === 0) {
            this.logger.error('Didit webhook secret is not configured');
            return false;
        }
        const timestampRaw = this.firstHeader(headers, 'x-timestamp');
        if (!timestampRaw) {
            this.logger.warn('Missing x-timestamp header on incoming webhook');
            return false;
        }
        const timestamp = parseInt(timestampRaw, 10);
        if (!Number.isFinite(timestamp)) {
            this.logger.warn(`Non-numeric x-timestamp header: ${timestampRaw}`);
            return false;
        }
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
            this.logger.warn(`Webhook timestamp out of tolerance (drift=${nowSeconds - timestamp}s, tolerance=${toleranceSeconds}s)`);
            return false;
        }
        const sigV2 = this.firstHeader(headers, 'x-signature-v2');
        if (sigV2) {
            if (this.verifyV2(rawBody, sigV2, secret))
                return true;
            this.logger.warn('x-signature-v2 present but failed verification');
        }
        const sigSimple = this.firstHeader(headers, 'x-signature-simple');
        if (sigSimple) {
            if (this.verifySimple(rawBody, sigSimple, timestamp, secret))
                return true;
            this.logger.warn('x-signature-simple present but failed verification');
        }
        const sigLegacy = this.firstHeader(headers, 'x-signature');
        if (sigLegacy) {
            if (this.verifyLegacy(rawBody, sigLegacy, secret))
                return true;
            this.logger.warn('x-signature present but failed verification');
        }
        this.logger.warn('No valid Didit signature header found on incoming webhook');
        return false;
    }
    verifyV2(rawBody, sigHex, secret) {
        let parsed;
        try {
            parsed = JSON.parse(rawBody.toString('utf8'));
        }
        catch {
            return false;
        }
        const canonical = JSON.stringify(this.sortKeys(this.shortenFloats(parsed)));
        const expected = (0, crypto_1.createHmac)('sha256', secret)
            .update(canonical, 'utf8')
            .digest('hex');
        return this.constantTimeEquals(expected, sigHex);
    }
    verifySimple(rawBody, sigHex, timestamp, secret) {
        let parsed;
        try {
            parsed = JSON.parse(rawBody.toString('utf8'));
        }
        catch {
            return false;
        }
        const canonical = `${timestamp}:${parsed?.session_id ?? ''}:${parsed?.status ?? ''}:${parsed?.webhook_type ?? ''}`;
        const expected = (0, crypto_1.createHmac)('sha256', secret)
            .update(canonical, 'utf8')
            .digest('hex');
        return this.constantTimeEquals(expected, sigHex);
    }
    verifyLegacy(rawBody, sigHex, secret) {
        const expected = (0, crypto_1.createHmac)('sha256', secret).update(rawBody).digest('hex');
        return this.constantTimeEquals(expected, sigHex);
    }
    constantTimeEquals(a, b) {
        if (a.length !== b.length)
            return false;
        try {
            return (0, crypto_1.timingSafeEqual)(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
        }
        catch {
            return false;
        }
    }
    sortKeys(value) {
        if (Array.isArray(value))
            return value.map((v) => this.sortKeys(v));
        if (value !== null && typeof value === 'object') {
            const src = value;
            const sorted = {};
            for (const key of Object.keys(src).sort()) {
                sorted[key] = this.sortKeys(src[key]);
            }
            return sorted;
        }
        return value;
    }
    shortenFloats(value) {
        if (Array.isArray(value))
            return value.map((v) => this.shortenFloats(v));
        if (value !== null && typeof value === 'object') {
            const src = value;
            const out = {};
            for (const [k, v] of Object.entries(src))
                out[k] = this.shortenFloats(v);
            return out;
        }
        if (typeof value === 'number' &&
            !Number.isInteger(value) &&
            value % 1 === 0) {
            return Math.trunc(value);
        }
        return value;
    }
    firstHeader(headers, key) {
        const raw = headers[key] ?? headers[key.toLowerCase()];
        if (Array.isArray(raw))
            return raw[0] ?? null;
        return raw ?? null;
    }
};
exports.DiditSignatureVerifier = DiditSignatureVerifier;
exports.DiditSignatureVerifier = DiditSignatureVerifier = DiditSignatureVerifier_1 = __decorate([
    (0, common_1.Injectable)()
], DiditSignatureVerifier);
//# sourceMappingURL=didit-signature.verifier.js.map