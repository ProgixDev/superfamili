import { createHmac } from 'crypto';
import { DiditSignatureVerifier } from './didit-signature.verifier';

/**
 * These tests lock in the security-critical part of the Didit integration.
 *
 * We don't have Didit's private signing key, so every test constructs a
 * signature the same way Didit does (per the algorithms documented at
 * https://docs.didit.me/integration/webhooks) and hands the resulting
 * headers to the verifier. If the canonicalization ever drifts, these
 * tests start failing.
 */

const SECRET = 'test-webhook-secret-abc123';
const TOLERANCE = 300; // seconds

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Sign a payload the same way Didit does for the V2 scheme:
 *   1. recursively sort keys
 *   2. normalize 1.0 → 1
 *   3. JSON.stringify with no whitespace
 *   4. HMAC-SHA256
 */
function signV2(body: unknown, secret: string): string {
  const sortKeys = (v: any): any => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v !== null && typeof v === 'object') {
      return Object.keys(v)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = sortKeys(v[k]);
          return acc;
        }, {});
    }
    return v;
  };
  const shortenFloats = (v: any): any => {
    if (Array.isArray(v)) return v.map(shortenFloats);
    if (v !== null && typeof v === 'object') {
      return Object.entries(v).reduce((acc: any, [k, val]) => {
        acc[k] = shortenFloats(val);
        return acc;
      }, {});
    }
    if (typeof v === 'number' && !Number.isInteger(v) && v % 1 === 0) {
      return Math.trunc(v);
    }
    return v;
  };

  const canonical = JSON.stringify(sortKeys(shortenFloats(body)));
  return createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

function signSimple(
  timestamp: number,
  sessionId: string,
  status: string,
  webhookType: string,
  secret: string,
): string {
  const canonical = `${timestamp}:${sessionId}:${status}:${webhookType}`;
  return createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

function signLegacy(rawBody: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('DiditSignatureVerifier', () => {
  let verifier: DiditSignatureVerifier;

  beforeEach(() => {
    verifier = new DiditSignatureVerifier();
  });

  // ─── V2 (recommended) ────────────────────────────────────────────────

  describe('X-Signature-V2 (canonical JSON)', () => {
    it('accepts a correctly-signed payload', () => {
      const ts = nowSeconds();
      const body = {
        session_id: '11111111-1111-4111-8111-111111111111',
        webhook_type: 'status.updated',
        status: 'Approved',
        timestamp: ts,
        score: 87.5,
      };
      const raw = Buffer.from(JSON.stringify(body), 'utf8');
      const sig = signV2(body, SECRET);

      const ok = verifier.verify(
        raw,
        {
          'x-signature-v2': sig,
          'x-timestamp': String(ts),
        },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(true);
    });

    it('rejects a tampered body (same signature, different bytes)', () => {
      const ts = nowSeconds();
      const body = {
        session_id: '11111111-1111-4111-8111-111111111111',
        webhook_type: 'status.updated',
        status: 'Approved',
        timestamp: ts,
      };
      const sig = signV2(body, SECRET);

      // Tamper the body AFTER signing: flip Approved → Declined.
      const tampered = Buffer.from(
        JSON.stringify({ ...body, status: 'Declined' }),
        'utf8',
      );

      const ok = verifier.verify(
        tampered,
        {
          'x-signature-v2': sig,
          'x-timestamp': String(ts),
        },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });

    it('accepts a middleware-re-encoded body (whitespace + key reorder)', () => {
      // Simulate a proxy that re-encodes the JSON with indentation and
      // in a different key order. V2 is supposed to survive this because
      // the canonical form is identical.
      const ts = nowSeconds();
      const original = {
        webhook_type: 'status.updated',
        session_id: '11111111-1111-4111-8111-111111111111',
        status: 'Approved',
        timestamp: ts,
      };
      const sig = signV2(original, SECRET);

      // Hostile re-encoding: reordered keys, pretty-printed.
      const reencoded = Buffer.from(
        JSON.stringify(
          {
            timestamp: ts,
            status: 'Approved',
            session_id: '11111111-1111-4111-8111-111111111111',
            webhook_type: 'status.updated',
          },
          null,
          2,
        ),
        'utf8',
      );

      const ok = verifier.verify(
        reencoded,
        { 'x-signature-v2': sig, 'x-timestamp': String(ts) },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(true);
    });

    it('rejects a payload with an expired timestamp', () => {
      const ts = nowSeconds() - 600; // 10 min ago, outside 5 min tolerance
      const body = {
        session_id: 'x',
        webhook_type: 'status.updated',
        timestamp: ts,
      };
      const raw = Buffer.from(JSON.stringify(body), 'utf8');
      const sig = signV2(body, SECRET);

      const ok = verifier.verify(
        raw,
        { 'x-signature-v2': sig, 'x-timestamp': String(ts) },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });

    it('rejects a payload with a future timestamp beyond tolerance', () => {
      const ts = nowSeconds() + 600;
      const body = {
        session_id: 'x',
        webhook_type: 'status.updated',
        timestamp: ts,
      };
      const raw = Buffer.from(JSON.stringify(body), 'utf8');
      const sig = signV2(body, SECRET);

      const ok = verifier.verify(
        raw,
        { 'x-signature-v2': sig, 'x-timestamp': String(ts) },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });

    it('rejects a payload with the wrong secret', () => {
      const ts = nowSeconds();
      const body = { session_id: 'x', webhook_type: 'status.updated' };
      const raw = Buffer.from(JSON.stringify(body), 'utf8');
      const sig = signV2(body, 'WRONG-SECRET');

      const ok = verifier.verify(
        raw,
        { 'x-signature-v2': sig, 'x-timestamp': String(ts) },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });
  });

  // ─── Simple fallback ─────────────────────────────────────────────────

  describe('X-Signature-Simple (fallback)', () => {
    it('accepts a correctly-signed tuple when V2 is absent', () => {
      const ts = nowSeconds();
      const body = {
        session_id: 'aaa-bbb-ccc',
        webhook_type: 'status.updated',
        status: 'Declined',
        timestamp: ts,
      };
      const raw = Buffer.from(JSON.stringify(body), 'utf8');
      const sig = signSimple(
        ts,
        'aaa-bbb-ccc',
        'Declined',
        'status.updated',
        SECRET,
      );

      const ok = verifier.verify(
        raw,
        {
          'x-signature-simple': sig,
          'x-timestamp': String(ts),
        },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(true);
    });

    it('rejects a simple signature with a wrong session_id', () => {
      const ts = nowSeconds();
      const body = {
        session_id: 'aaa-bbb-ccc',
        webhook_type: 'status.updated',
        status: 'Approved',
        timestamp: ts,
      };
      const raw = Buffer.from(JSON.stringify(body), 'utf8');
      const sig = signSimple(
        ts,
        'DIFFERENT',
        'Approved',
        'status.updated',
        SECRET,
      );

      const ok = verifier.verify(
        raw,
        { 'x-signature-simple': sig, 'x-timestamp': String(ts) },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });
  });

  // ─── Legacy X-Signature ──────────────────────────────────────────────

  describe('X-Signature (legacy raw bytes)', () => {
    it('accepts a correctly-signed raw body when V2 and Simple are absent', () => {
      const ts = nowSeconds();
      const raw = Buffer.from(
        JSON.stringify({
          session_id: 'abc',
          webhook_type: 'status.updated',
          status: 'Approved',
          timestamp: ts,
        }),
        'utf8',
      );
      const sig = signLegacy(raw, SECRET);

      const ok = verifier.verify(
        raw,
        { 'x-signature': sig, 'x-timestamp': String(ts) },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(true);
    });
  });

  // ─── Negative / edge cases ───────────────────────────────────────────

  describe('edge cases', () => {
    it('rejects when no signature header is present', () => {
      const ts = nowSeconds();
      const raw = Buffer.from('{}', 'utf8');
      const ok = verifier.verify(
        raw,
        { 'x-timestamp': String(ts) },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });

    it('rejects when timestamp header is missing', () => {
      const raw = Buffer.from('{}', 'utf8');
      const ok = verifier.verify(
        raw,
        { 'x-signature-v2': 'deadbeef' },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });

    it('rejects when the secret is empty', () => {
      const ts = nowSeconds();
      const raw = Buffer.from('{}', 'utf8');
      const ok = verifier.verify(
        raw,
        { 'x-signature-v2': 'x', 'x-timestamp': String(ts) },
        '',
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });

    it('rejects when timestamp is non-numeric', () => {
      const raw = Buffer.from('{}', 'utf8');
      const ok = verifier.verify(
        raw,
        { 'x-signature-v2': 'x', 'x-timestamp': 'not-a-number' },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });

    it('rejects when body is not valid JSON under V2', () => {
      const ts = nowSeconds();
      const raw = Buffer.from('not-json{', 'utf8');
      const ok = verifier.verify(
        raw,
        { 'x-signature-v2': 'x', 'x-timestamp': String(ts) },
        SECRET,
        TOLERANCE,
      );
      expect(ok).toBe(false);
    });
  });
});
