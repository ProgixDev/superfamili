import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';

/** Accepted `consent_type` enum values — mirrors the SQL enum exactly. */
export const CONSENT_TYPES = [
  'terms_of_use',
  'privacy_policy',
  'kyc_verification',
  'reference_contact',
  'background_check_storage',
  'marketing_emails',
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

/**
 * Body for `POST /consents/accept`.
 *
 * `accepted` is included explicitly (rather than implied true) so the same
 * endpoint can also record a "no thanks" decision for optional consents
 * like `marketing_emails`. For required consents, the frontend is expected
 * to only send `accepted: true`; refusal is handled by aborting the signup.
 */
export class AcceptConsentDto {
  @ApiProperty({ enum: CONSENT_TYPES })
  @IsEnum(CONSENT_TYPES, { message: 'Type de consentement invalide.' })
  consent_type: ConsentType;

  @ApiProperty({
    description: 'Version of the policy being accepted (e.g., "2026-04-11").',
    example: '2026-04-11',
  })
  @IsString()
  @IsNotEmpty({ message: 'La version de la politique est requise.' })
  version: string;

  @ApiProperty({
    description:
      'Whether the user accepted or declined. Must be true for required consents.',
  })
  @IsBoolean()
  accepted: boolean;
}
