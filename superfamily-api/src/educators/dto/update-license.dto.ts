import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

/**
 * Payload for `POST /educators/me/license`.
 *
 * Accepts either JSON or multipart/form-data. When `hasLicense` is true,
 * the request must be multipart with a `file` field — the backend uploads
 * it to the private `licenses` bucket using the service role. When false,
 * the backend resets license_status to `none`.
 *
 * The backend never lets the client set license_status to `approved`; that
 * transition happens only via the admin review endpoint.
 */
export class UpdateLicenseDto {
  @ApiProperty({
    description:
      'Whether the educator claims to hold a government childcare license.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  @IsBoolean()
  hasLicense: boolean;
}
