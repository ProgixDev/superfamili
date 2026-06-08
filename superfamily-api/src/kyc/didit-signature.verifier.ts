import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Verifies HMAC-SHA256 signatures on inbound Didit webhook requests.
 *
 * Didit sends up to three signature headers. We check them in order of
 * preference:
 *
 *   1. `x-signature-v2`    — HMAC of a canonical-JSON representation.
 *                             Survives middleware that re-encodes the body.
 *                             Recommended by Didit.
 *   2. `x-signature-simple` — HMAC of `{timestamp}:{session_id}:{status}:{webhook_type}`.
 *                             Small attack surface — only the tuple is signed,
 *                             not the full body.
 *   3. `x-signature`        — HMAC of the raw JSON bytes, legacy.
 *
 * All three are gated by the `x-timestamp` header, which must be within the
 * configured tolerance window (default 300s) of server time. This prevents
 * replay of old webhook events.
 *
 * Every comparison uses `crypto.timingSafeEqual` to avoid leaking the
 * correct signature byte-by-byte through response-time side channels.
 *
 * Source: https://docs.didit.me/integration/webhooks
 */
@Injectable()
export class DiditSignatureVerifier {
  private readonly logger = new Logger(DiditSignatureVerifier.name);

  /**
   * Returns `true` if the request is authentic and fresh, `false` otherwise.
   * Does NOT throw — the caller decides the HTTP response.
   *
   * @param rawBody       the UNPARSED request body (Buffer), exactly as
   *                      Didit sent it. Required for both v2 and legacy.
   * @param headers       lowercase header map (Nest gives you this via
   *                      `@Headers()` — pass it as-is).
   * @param secret        the webhook secret from the Didit console.
   * @param toleranceSeconds max allowed drift between `x-timestamp` and now.
   */
  verify(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
    toleranceSeconds: number,
  ): boolean {
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
      this.logger.warn(
        `Webhook timestamp out of tolerance (drift=${nowSeconds - timestamp}s, tolerance=${toleranceSeconds}s)`,
      );
      return false;
    }

    // Attempt V2 first (most robust). Missing header just falls through.
    const sigV2 = this.firstHeader(headers, 'x-signature-v2');
    if (sigV2) {
      if (this.verifyV2(rawBody, sigV2, secret)) return true;
      this.logger.warn('x-signature-v2 present but failed verification');
    }

    // Fallback: simple tuple signature.
    const sigSimple = this.firstHeader(headers, 'x-signature-simple');
    if (sigSimple) {
      if (this.verifySimple(rawBody, sigSimple, timestamp, secret)) return true;
      this.logger.warn('x-signature-simple present but failed verification');
    }

    // Last resort: legacy raw-bytes signature.
    const sigLegacy = this.firstHeader(headers, 'x-signature');
    if (sigLegacy) {
      if (this.verifyLegacy(rawBody, sigLegacy, secret)) return true;
      this.logger.warn('x-signature present but failed verification');
    }

    this.logger.warn(
      'No valid Didit signature header found on incoming webhook',
    );
    return false;
  }

  // ─── V2: canonical JSON ───────────────────────────────────────────────
  //
  // Didit's v2 algorithm:
  //   1. Parse the body as JSON.
  //   2. Walk the tree: normalize floats that happen to be integers
  //      (1.0 → 1) so both languages serialize them identically.
  //   3. Sort every object's keys lexicographically (recursively).
  //   4. `JSON.stringify` with no whitespace, Unicode unescaped.
  //   5. HMAC-SHA256 the result with the webhook secret.
  //
  // This is middleware-safe because proxies that re-encode the JSON (adding
  // whitespace, reordering keys, escaping Unicode) don't change the canonical
  // form — so the signature still matches.
  private verifyV2(rawBody: Buffer, sigHex: string, secret: string): boolean {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return false;
    }

    const canonical = JSON.stringify(this.sortKeys(this.shortenFloats(parsed)));
    const expected = createHmac('sha256', secret)
      .update(canonical, 'utf8')
      .digest('hex');

    return this.constantTimeEquals(expected, sigHex);
  }

  // ─── Simple: {timestamp}:{session_id}:{status}:{webhook_type} ─────────
  private verifySimple(
    rawBody: Buffer,
    sigHex: string,
    timestamp: number,
    secret: string,
  ): boolean {
    let parsed: any;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return false;
    }

    const canonical = `${timestamp}:${parsed?.session_id ?? ''}:${parsed?.status ?? ''}:${parsed?.webhook_type ?? ''}`;
    const expected = createHmac('sha256', secret)
      .update(canonical, 'utf8')
      .digest('hex');

    return this.constantTimeEquals(expected, sigHex);
  }

  // ─── Legacy: raw bytes ────────────────────────────────────────────────
  private verifyLegacy(
    rawBody: Buffer,
    sigHex: string,
    secret: string,
  ): boolean {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return this.constantTimeEquals(expected, sigHex);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Constant-time hex-string comparison. Returns false if lengths differ
   * (so we never crash `timingSafeEqual` on length mismatch).
   */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
    } catch {
      return false;
    }
  }

  /** Recursively sorts object keys so two equivalent objects serialize the same. */
  private sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.sortKeys(v));
    if (value !== null && typeof value === 'object') {
      const src = value as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(src).sort()) {
        sorted[key] = this.sortKeys(src[key]);
      }
      return sorted;
    }
    return value;
  }

  /**
   * Normalizes floats that happen to be integers (1.0 → 1) so Python's
   * `json.dumps` (Didit-side) and Node's `JSON.stringify` produce the same
   * output. Negative zero is kept as -0 (never emitted by JSON anyway).
   */
  private shortenFloats(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.shortenFloats(v));
    if (value !== null && typeof value === 'object') {
      const src = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) out[k] = this.shortenFloats(v);
      return out;
    }
    if (
      typeof value === 'number' &&
      !Number.isInteger(value) &&
      value % 1 === 0
    ) {
      return Math.trunc(value);
    }
    return value;
  }

  /** Normalizes `headers[k]` which may be string | string[] | undefined. */
  private firstHeader(
    headers: Record<string, string | string[] | undefined>,
    key: string,
  ): string | null {
    const raw = headers[key] ?? headers[key.toLowerCase()];
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  }
}
