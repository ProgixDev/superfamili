import { SetMetadata } from '@nestjs/common';

/**
 * Marks an endpoint as allowed to run before a `profiles` row exists for the
 * authenticated user. The only legitimate use is `POST /auth/signup` which
 * creates the profile itself — every other authenticated endpoint requires a
 * profile to already exist and should NOT use this decorator.
 *
 * When this decorator is NOT present, `SupabaseAuthGuard` will reject any
 * request from an authenticated user whose profile cannot be loaded, with a
 * clear `UnauthorizedException`, instead of silently falling back to a default
 * role and leaving `profileId` undefined.
 */
export const ALLOW_NO_PROFILE_KEY = 'allowNoProfile';
export const AllowNoProfile = () => SetMetadata(ALLOW_NO_PROFILE_KEY, true);
