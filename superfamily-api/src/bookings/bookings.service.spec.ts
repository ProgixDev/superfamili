import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PayoutsService } from '../payments/payouts.service';
import { PaymentsService } from '../payments/payments.service';
import {
  EducatorsService,
  LICENSED_CHILD_CAP,
  UNLICENSED_CHILD_CAP,
} from '../educators/educators.service';

/**
 * Two things are under test here:
 *
 *  1. The earlier authorization-error fix: `BookingsService.create` must
 *     distinguish "no profileId" (401), "no parent_profiles row" (403), and
 *     "DB error during parent lookup" (400), and must never surface the
 *     legacy cryptic "Profil parent non trouvé".
 *
 *  2. The Quebec license tier child-cap check: before inserting a booking,
 *     count overlapping bookings for this educator, add the new child, and
 *     reject if the total exceeds the educator's cap (5 without a license,
 *     15 with an `approved` license). The cap is resolved via
 *     `EducatorsService.getMaxChildrenForEducator`.
 */

type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  in: jest.Mock;
  lt: jest.Mock;
  gt: jest.Mock;
  limit: jest.Mock;
};

function makeQueryBuilder(): MockQueryBuilder {
  const qb: any = {};
  qb.select = jest.fn().mockReturnValue(qb);
  qb.eq = jest.fn().mockReturnValue(qb);
  qb.in = jest.fn().mockReturnValue(qb);
  qb.lt = jest.fn().mockReturnValue(qb);
  qb.gt = jest.fn().mockReturnValue(qb);
  qb.limit = jest.fn().mockReturnValue(qb);
  qb.insert = jest.fn().mockReturnValue(qb);
  qb.update = jest.fn().mockReturnValue(qb);
  qb.maybeSingle = jest.fn();
  qb.single = jest.fn();
  return qb;
}

describe('BookingsService.create — authorization fix', () => {
  let service: BookingsService;
  let parentProfilesQb: MockQueryBuilder;
  let supabaseFrom: jest.Mock;

  const validDto: any = {
    educator_profile_id: '11111111-1111-4111-8111-111111111111',
    service_id: '22222222-2222-4222-8222-222222222222',
    booking_date_start: '2026-05-01T09:00:00Z',
    booking_date_end: '2026-05-01T12:00:00Z',
    duration_hours: 3,
  };

  beforeEach(async () => {
    parentProfilesQb = makeQueryBuilder();

    supabaseFrom = jest.fn((table: string) => {
      if (table === 'parent_profiles') return parentProfilesQb;
      return makeQueryBuilder();
    });

    const supabaseService = {
      getServiceClient: () => ({ from: supabaseFrom }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        {
          provide: PayoutsService,
          useValue: { createPayoutRecord: jest.fn() },
        },
        { provide: PaymentsService, useValue: { processRefund: jest.fn() } },
        {
          provide: EducatorsService,
          useValue: {
            getMaxChildrenForEducator: jest
              .fn()
              .mockResolvedValue(UNLICENSED_CHILD_CAP),
          },
        },
      ],
    }).compile();

    service = module.get(BookingsService);
  });

  it('throws UnauthorizedException with a clear message when profileId is undefined', async () => {
    await expect(
      service.create(undefined as unknown as string, validDto),
    ).rejects.toMatchObject({
      constructor: UnauthorizedException,
      message: expect.stringContaining('Profil utilisateur introuvable'),
    });
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when profileId is an empty string', async () => {
    await expect(service.create('', validDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException with a helpful message when the user has no parent_profiles row', async () => {
    parentProfilesQb.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      service.create('profile-uuid-abc', validDto),
    ).rejects.toMatchObject({
      constructor: ForbiddenException,
      message: expect.stringContaining('Aucun profil parent'),
    });

    expect(supabaseFrom).toHaveBeenCalledWith('parent_profiles');
    expect(parentProfilesQb.eq).toHaveBeenCalledWith(
      'profile_id',
      'profile-uuid-abc',
    );
    expect(parentProfilesQb.maybeSingle).toHaveBeenCalled();
    expect(parentProfilesQb.single).not.toHaveBeenCalled();
  });

  it('surfaces a database error during parent_profiles lookup as BadRequestException (not ForbiddenException)', async () => {
    parentProfilesQb.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection refused' },
    });

    await expect(
      service.create('profile-uuid-abc', validDto),
    ).rejects.not.toMatchObject({
      message: expect.stringContaining('Profil parent non trouvé'),
    });
  });
});

describe('BookingsService.create — Quebec child-cap enforcement', () => {
  /**
   * Helper: build a BookingsService where the happy path up to (and
   * including) the child-cap check is fully wired. Callers can override the
   * license tier and the "existing overlapping bookings" count.
   */
  async function buildService({
    maxChildren,
    overlappingBookings,
  }: {
    maxChildren: number;
    overlappingBookings: Array<{ id: string; child_id: string | null }>;
  }) {
    // Separate query builders per table so assertions can poke at them.
    const parentProfilesQb = makeQueryBuilder();
    parentProfilesQb.maybeSingle.mockResolvedValue({
      data: { id: 'parent-profile-1' },
      error: null,
    });

    const educatorServicesQb = makeQueryBuilder();
    educatorServicesQb.single.mockResolvedValue({
      data: { hourly_rate_cents: 2000 },
      error: null,
    });

    const profilesQb = makeQueryBuilder();
    profilesQb.single.mockResolvedValue({
      data: { postal_code: 'H2X1Y4' },
      error: null,
    });

    const educatorProfilesQb = makeQueryBuilder();
    educatorProfilesQb.single.mockResolvedValue({
      data: {
        profile_id: 'educ-profile-1',
        profiles: { postal_code: 'H3A1A1' },
      },
      error: null,
    });

    const platformSettingsQb = makeQueryBuilder();
    platformSettingsQb.single.mockResolvedValue({
      data: {
        platform_commission_percentage: 30,
        free_mileage_km: 20,
        mileage_fee_per_km_cents: 100,
      },
      error: null,
    });

    const postalCodesQb = makeQueryBuilder();
    postalCodesQb.single.mockResolvedValue({
      data: { latitude: 45.5, longitude: -73.6 },
      error: null,
    });

    const bookingsOverlapQb = makeQueryBuilder();
    // The service-under-test calls: .from('bookings').select(...).eq(...).in(...).lt(...).gt(...)
    // We need the final `.gt()` call to resolve to the data. The query
    // builder chain returns `qb` from each step, so we attach the resolve
    // via a `then` shim on `qb.gt`.
    bookingsOverlapQb.gt.mockReturnValue({
      then: (onFulfilled: any) =>
        Promise.resolve({ data: overlappingBookings, error: null }).then(
          onFulfilled,
        ),
    } as any);

    // Final insert builder (only reached if the cap check passes).
    const bookingsInsertQb = makeQueryBuilder();
    bookingsInsertQb.single.mockResolvedValue({
      data: { id: 'booking-1', total_amount_cents: 6000 },
      error: null,
    });

    // `from('bookings')` is called twice: once for the overlap query, once
    // for the final insert. Return the right builder per call-sequence.
    let bookingsCallCount = 0;

    const supabaseFrom = jest.fn((table: string) => {
      switch (table) {
        case 'parent_profiles':
          return parentProfilesQb;
        case 'educator_services':
          return educatorServicesQb;
        case 'profiles':
          return profilesQb;
        case 'educator_profiles':
          return educatorProfilesQb;
        case 'platform_settings':
          return platformSettingsQb;
        case 'postal_codes':
          return postalCodesQb;
        case 'bookings':
          bookingsCallCount += 1;
          return bookingsCallCount === 1 ? bookingsOverlapQb : bookingsInsertQb;
        default:
          return makeQueryBuilder();
      }
    });

    const supabaseService = {
      getServiceClient: () => ({ from: supabaseFrom }),
    };

    const educatorsServiceMock = {
      getMaxChildrenForEducator: jest.fn().mockResolvedValue(maxChildren),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        {
          provide: PayoutsService,
          useValue: { createPayoutRecord: jest.fn() },
        },
        { provide: PaymentsService, useValue: { processRefund: jest.fn() } },
        { provide: EducatorsService, useValue: educatorsServiceMock },
      ],
    }).compile();

    return {
      service: module.get(BookingsService),
      educatorsServiceMock,
      bookingsOverlapQb,
      supabaseFrom,
    };
  }

  const baseDto: any = {
    educator_profile_id: '11111111-1111-4111-8111-111111111111',
    service_id: '22222222-2222-4222-8222-222222222222',
    child_id: '33333333-3333-4333-8333-333333333333',
    booking_date_start: '2026-05-01T09:00:00Z',
    booking_date_end: '2026-05-01T12:00:00Z',
    duration_hours: 3,
    location_postal_code: 'H2X1Y4',
  };

  it('accepts the booking when an unlicensed educator already has 4 children (total 5 = cap)', async () => {
    const { service } = await buildService({
      maxChildren: UNLICENSED_CHILD_CAP,
      overlappingBookings: Array.from({ length: 4 }, (_, i) => ({
        id: `b-${i}`,
        child_id: `c-${i}`,
      })),
    });

    await expect(service.create('profile-1', baseDto)).resolves.toBeDefined();
  });

  it('rejects the booking when an unlicensed educator already has 5 children (total 6 > 5)', async () => {
    const { service } = await buildService({
      maxChildren: UNLICENSED_CHILD_CAP,
      overlappingBookings: Array.from({ length: 5 }, (_, i) => ({
        id: `b-${i}`,
        child_id: `c-${i}`,
      })),
    });

    await expect(service.create('profile-1', baseDto)).rejects.toMatchObject({
      constructor: BadRequestException,
      message: expect.stringContaining(
        `limite de ${UNLICENSED_CHILD_CAP} enfants`,
      ),
    });
  });

  it('rejection message cites Quebec childcare law', async () => {
    const { service } = await buildService({
      maxChildren: UNLICENSED_CHILD_CAP,
      overlappingBookings: Array.from({ length: 5 }, (_, i) => ({
        id: `b-${i}`,
        child_id: `c-${i}`,
      })),
    });

    await expect(service.create('profile-1', baseDto)).rejects.toMatchObject({
      message: expect.stringContaining('Loi du Québec'),
    });
  });

  it('accepts a 6th child when the educator has an approved license (cap = 15)', async () => {
    const { service } = await buildService({
      maxChildren: LICENSED_CHILD_CAP,
      overlappingBookings: Array.from({ length: 5 }, (_, i) => ({
        id: `b-${i}`,
        child_id: `c-${i}`,
      })),
    });

    await expect(service.create('profile-1', baseDto)).resolves.toBeDefined();
  });

  it('rejects the 16th child even for a licensed educator (cap = 15)', async () => {
    const { service } = await buildService({
      maxChildren: LICENSED_CHILD_CAP,
      overlappingBookings: Array.from({ length: 15 }, (_, i) => ({
        id: `b-${i}`,
        child_id: `c-${i}`,
      })),
    });

    await expect(service.create('profile-1', baseDto)).rejects.toMatchObject({
      constructor: BadRequestException,
      message: expect.stringContaining(
        `limite de ${LICENSED_CHILD_CAP} enfants`,
      ),
    });
  });

  it('queries the overlap window with lt(end) / gt(start) so back-to-back bookings do NOT count', async () => {
    const { service, bookingsOverlapQb } = await buildService({
      maxChildren: UNLICENSED_CHILD_CAP,
      overlappingBookings: [],
    });

    await service.create('profile-1', baseDto);

    expect(bookingsOverlapQb.lt).toHaveBeenCalledWith(
      'booking_date_start',
      baseDto.booking_date_end,
    );
    expect(bookingsOverlapQb.gt).toHaveBeenCalledWith(
      'booking_date_end',
      baseDto.booking_date_start,
    );
    // Only active/pending statuses count toward the cap — cancelled /
    // completed / refunded must not.
    expect(bookingsOverlapQb.in).toHaveBeenCalledWith('status', [
      'pending_payment',
      'confirmed',
      'in_progress',
    ]);
  });

  it('consults EducatorsService.getMaxChildrenForEducator once per booking', async () => {
    const { service, educatorsServiceMock } = await buildService({
      maxChildren: UNLICENSED_CHILD_CAP,
      overlappingBookings: [],
    });

    await service.create('profile-1', baseDto);

    expect(
      educatorsServiceMock.getMaxChildrenForEducator,
    ).toHaveBeenCalledTimes(1);
    expect(educatorsServiceMock.getMaxChildrenForEducator).toHaveBeenCalledWith(
      baseDto.educator_profile_id,
    );
  });
});
