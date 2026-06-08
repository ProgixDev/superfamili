import { createHmac } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedException } from '@nestjs/common';
import { KycService, KYC_STATUS_CHANGED_EVENT } from './kyc.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentsService } from '../consents/consents.service';
import { DiditSignatureVerifier } from './didit-signature.verifier';

/**
 * End-to-end tests for KycService.handleWebhook. These exercise:
 *   - signature verification is required (bad sig → UnauthorizedException)
 *   - Approved status flips kyc_verifications + educator_profiles mirror
 *   - Declined status flips both to declined
 *   - replay of the same event is a no-op (idempotency)
 *   - unknown vendor_data doesn't crash — event is dropped with a log
 *   - irrelevant event types are ack'd without DB writes
 *
 * Supabase is mocked via a tiny query-builder. `configService.get` is
 * stubbed to return the shape the service expects.
 */

const WEBHOOK_SECRET = 'test-webhook-secret';
const TOLERANCE = 300;
const MIN_CONFIDENCE = 70;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Sign a body the way Didit's V2 scheme does. */
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
  const canonical = JSON.stringify(sortKeys(body));
  return createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

/** Build webhook headers with a fresh timestamp and a valid V2 signature. */
function headersFor(body: unknown): Record<string, string> {
  const ts = nowSeconds();
  return {
    'x-signature-v2': signV2(body, WEBHOOK_SECRET),
    'x-timestamp': String(ts),
  };
}

type QB = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
};

function qb(): QB {
  const self: any = {};
  self.select = jest.fn().mockReturnValue(self);
  self.insert = jest.fn().mockReturnValue(self);
  self.update = jest.fn().mockReturnValue(self);
  self.upsert = jest.fn().mockResolvedValue({ data: {}, error: null });
  self.eq = jest.fn().mockReturnValue(self);
  self.order = jest.fn().mockReturnValue(self);
  self.limit = jest.fn().mockReturnValue(self);
  self.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
  self.single = jest.fn().mockResolvedValue({ data: null, error: null });
  return self;
}

describe('KycService.handleWebhook', () => {
  let service: KycService;
  let kycVerificationsQb: QB;
  let educatorProfilesQb: QB;
  let supabaseFrom: jest.Mock;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    kycVerificationsQb = qb();
    educatorProfilesQb = qb();

    supabaseFrom = jest.fn((table: string) => {
      if (table === 'kyc_verifications') return kycVerificationsQb;
      if (table === 'educator_profiles') return educatorProfilesQb;
      return qb();
    });

    const supabaseService = {
      getServiceClient: () => ({ from: supabaseFrom }),
    };

    const configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'didit.webhookSecret':
            return WEBHOOK_SECRET;
          case 'didit.webhookTimestampToleranceSeconds':
            return TOLERANCE;
          case 'didit.minConfidenceScore':
            return MIN_CONFIDENCE;
          case 'didit.baseUrl':
            return 'https://verification.didit.me';
          case 'didit.apiKey':
            return 'test-api-key';
          case 'didit.workflowId':
            return 'test-workflow-id';
          case 'publicBaseUrl':
            return 'https://example.ngrok.app';
          default:
            return undefined;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        DiditSignatureVerifier,
        { provide: ConfigService, useValue: configService },
        { provide: SupabaseService, useValue: supabaseService },
        EventEmitter2,
        // Minimal ConsentsService mock — KycService.handleWebhook (what
        // most tests in this file exercise) never touches consents. The
        // gate is inside createSession, which is tested separately if
        // at all. We still have to provide the token so the module
        // compiles.
        {
          provide: ConsentsService,
          useValue: {
            requireConsent: jest.fn().mockResolvedValue(undefined),
            hasValidConsent: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get(KycService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('rejects a webhook with no signature', async () => {
    const body = {
      webhook_type: 'status.updated',
      session_id: 'sess-1',
      status: 'Approved',
      timestamp: nowSeconds(),
    };
    const raw = Buffer.from(JSON.stringify(body), 'utf8');

    await expect(
      service.handleWebhook(raw, { 'x-timestamp': String(nowSeconds()) }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // Should NOT touch the DB on a failed signature.
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  it('rejects a webhook with a tampered body (same sig, different bytes)', async () => {
    const original = {
      webhook_type: 'status.updated',
      session_id: 'sess-1',
      status: 'Approved',
      timestamp: nowSeconds(),
    };
    const headers = headersFor(original);

    const tampered = Buffer.from(
      JSON.stringify({ ...original, status: 'Declined' }),
      'utf8',
    );

    await expect(
      service.handleWebhook(tampered, headers),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('processes an Approved status.updated event and flips educator_profiles.kyc_status = approved', async () => {
    const userId = '99999999-9999-4999-8999-999999999999';

    kycVerificationsQb.maybeSingle.mockResolvedValue({
      data: { id: 'row-1', user_id: userId, status: 'in_progress' },
      error: null,
    });

    const body: any = {
      webhook_type: 'status.updated',
      session_id: 'sess-1',
      status: 'Approved',
      timestamp: nowSeconds(),
      vendor_data: userId,
      decision: {
        id_verifications: [
          {
            document_type: 'Identity Card',
            document_number: 'AB12345',
            first_name: 'Marie',
            last_name: 'Tremblay',
            date_of_birth: '1990-05-01',
            issuing_state: 'QC',
            front_image_quality_score: { overall_score: 92 },
          },
        ],
        liveness_checks: [{ score: 85 }],
        face_matches: [{ score: 78 }],
      },
    };
    const raw = Buffer.from(JSON.stringify(body), 'utf8');
    const headers = headersFor(body);

    const emitSpy = jest.spyOn(eventEmitter, 'emit');

    await service.handleWebhook(raw, headers);

    // Upserted the kyc_verifications row with status=approved and the
    // extracted decision fields.
    expect(kycVerificationsQb.upsert).toHaveBeenCalled();
    const upsertArg = kycVerificationsQb.upsert.mock.calls[0][0];
    expect(upsertArg).toMatchObject({
      didit_session_id: 'sess-1',
      status: 'approved',
      decision: 'Approved',
      confidence_score: 78, // min of 92 / 85 / 78
      extracted_full_name: 'Marie Tremblay',
      extracted_document_number: 'AB12345',
    });

    // Flipped the educator_profiles mirror.
    expect(educatorProfilesQb.update).toHaveBeenCalled();
    const updateArg = educatorProfilesQb.update.mock.calls[0][0];
    expect(updateArg.kyc_status).toBe('approved');
    expect(updateArg.kyc_verified_at).toBeTruthy();
    expect(educatorProfilesQb.eq).toHaveBeenCalledWith('profile_id', userId);

    // Emitted the status-changed event for the gateway.
    expect(emitSpy).toHaveBeenCalledWith(
      KYC_STATUS_CHANGED_EVENT,
      expect.objectContaining({
        userId,
        status: 'approved',
        confidenceScore: 78,
      }),
    );
  });

  it('does NOT flip educator_profiles to approved when confidence is below the minimum', async () => {
    const userId = '88888888-8888-4888-8888-888888888888';

    kycVerificationsQb.maybeSingle.mockResolvedValue({
      data: { id: 'row-1', user_id: userId, status: 'in_progress' },
      error: null,
    });

    const body: any = {
      webhook_type: 'status.updated',
      session_id: 'sess-low-score',
      status: 'Approved',
      timestamp: nowSeconds(),
      vendor_data: userId,
      decision: {
        id_verifications: [
          { front_image_quality_score: { overall_score: 60 } },
        ],
        liveness_checks: [{ score: 50 }], // min=50, below 70 threshold
      },
    };
    const raw = Buffer.from(JSON.stringify(body), 'utf8');

    await service.handleWebhook(raw, headersFor(body));

    // kyc_verifications row gets upserted (we record what Didit said).
    expect(kycVerificationsQb.upsert).toHaveBeenCalled();
    // But educator_profiles is NOT updated because confidence was too low.
    expect(educatorProfilesQb.update).not.toHaveBeenCalled();
  });

  it('processes a Declined event and flips educator_profiles.kyc_status = declined', async () => {
    const userId = '77777777-7777-4777-8777-777777777777';

    kycVerificationsQb.maybeSingle.mockResolvedValue({
      data: { id: 'row-2', user_id: userId, status: 'in_progress' },
      error: null,
    });

    const body: any = {
      webhook_type: 'status.updated',
      session_id: 'sess-declined',
      status: 'Declined',
      timestamp: nowSeconds(),
      vendor_data: userId,
    };
    const raw = Buffer.from(JSON.stringify(body), 'utf8');

    await service.handleWebhook(raw, headersFor(body));

    expect(kycVerificationsQb.upsert).toHaveBeenCalled();
    expect(kycVerificationsQb.upsert.mock.calls[0][0].status).toBe('declined');

    expect(educatorProfilesQb.update).toHaveBeenCalled();
    expect(educatorProfilesQb.update.mock.calls[0][0].kyc_status).toBe(
      'declined',
    );
    expect(
      educatorProfilesQb.update.mock.calls[0][0].kyc_verified_at,
    ).toBeNull();
  });

  it('maps "In Review" to review_required and updates the mirror', async () => {
    const userId = '66666666-6666-4666-8666-666666666666';
    kycVerificationsQb.maybeSingle.mockResolvedValue({
      data: { id: 'row-3', user_id: userId, status: 'in_progress' },
      error: null,
    });

    const body: any = {
      webhook_type: 'status.updated',
      session_id: 'sess-review',
      status: 'In Review',
      timestamp: nowSeconds(),
      vendor_data: userId,
    };

    await service.handleWebhook(
      Buffer.from(JSON.stringify(body), 'utf8'),
      headersFor(body),
    );

    expect(kycVerificationsQb.upsert.mock.calls[0][0].status).toBe(
      'review_required',
    );
    expect(educatorProfilesQb.update.mock.calls[0][0].kyc_status).toBe(
      'review_required',
    );
  });

  it('is a no-op when the same status arrives twice in a row (idempotency)', async () => {
    const userId = '55555555-5555-4555-8555-555555555555';

    // Existing row already has status=approved; replay should not upsert.
    kycVerificationsQb.maybeSingle.mockResolvedValue({
      data: { id: 'row-5', user_id: userId, status: 'approved' },
      error: null,
    });

    const body: any = {
      webhook_type: 'status.updated',
      session_id: 'sess-replay',
      status: 'Approved',
      timestamp: nowSeconds(),
      vendor_data: userId,
      // No decision block → confidence_score is null → idempotency path.
    };

    await service.handleWebhook(
      Buffer.from(JSON.stringify(body), 'utf8'),
      headersFor(body),
    );

    expect(kycVerificationsQb.upsert).not.toHaveBeenCalled();
    expect(educatorProfilesQb.update).not.toHaveBeenCalled();
  });

  it('ignores irrelevant event types without touching the DB', async () => {
    const body: any = {
      webhook_type: 'transaction.created',
      timestamp: nowSeconds(),
      amount: '100.00',
    };

    await service.handleWebhook(
      Buffer.from(JSON.stringify(body), 'utf8'),
      headersFor(body),
    );

    // kyc_verifications.maybeSingle is only called for status/data updates.
    expect(kycVerificationsQb.maybeSingle).not.toHaveBeenCalled();
    expect(kycVerificationsQb.upsert).not.toHaveBeenCalled();
    expect(educatorProfilesQb.update).not.toHaveBeenCalled();
  });

  it('drops an event whose vendor_data does not match any existing row', async () => {
    // No existing row.
    kycVerificationsQb.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const body: any = {
      webhook_type: 'status.updated',
      session_id: 'sess-orphan',
      status: 'Approved',
      timestamp: nowSeconds(),
      // No vendor_data either.
    };

    // Should not throw — dropping an orphaned event returns 200 so Didit
    // stops retrying.
    await service.handleWebhook(
      Buffer.from(JSON.stringify(body), 'utf8'),
      headersFor(body),
    );

    expect(kycVerificationsQb.upsert).not.toHaveBeenCalled();
    expect(educatorProfilesQb.update).not.toHaveBeenCalled();
  });

  it('falls back to vendor_data when no existing row is found', async () => {
    const userId = '44444444-4444-4444-8444-444444444444';

    kycVerificationsQb.maybeSingle.mockResolvedValue({
      data: null, // row missing — createSession crashed after Didit accepted
      error: null,
    });

    const body: any = {
      webhook_type: 'status.updated',
      session_id: 'sess-fallback',
      status: 'Approved',
      timestamp: nowSeconds(),
      vendor_data: userId,
      decision: {
        id_verifications: [
          { front_image_quality_score: { overall_score: 95 } },
        ],
      },
    };

    await service.handleWebhook(
      Buffer.from(JSON.stringify(body), 'utf8'),
      headersFor(body),
    );

    // Inserted a fresh row via upsert with vendor_data as user_id.
    expect(kycVerificationsQb.upsert).toHaveBeenCalled();
    expect(kycVerificationsQb.upsert.mock.calls[0][0].user_id).toBe(userId);
    expect(kycVerificationsQb.upsert.mock.calls[0][0].status).toBe('approved');

    // And still mirrored onto educator_profiles.
    expect(educatorProfilesQb.update).toHaveBeenCalled();
    expect(educatorProfilesQb.eq).toHaveBeenCalledWith('profile_id', userId);
  });
});
