import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * `PATCH` body for admin reference verification. The admin calls the
 * reference by phone / email to confirm they actually know the educator
 * and vouched for the testimonial, then flips `verified = true`.
 *
 * `notes` is freeform and stored on the row so multiple admins have
 * visibility into what the verifying admin heard.
 */
export class VerifyReferenceDto {
  @ApiProperty({
    required: false,
    description:
      'Notes from the verification call (freeform, visible to other admins).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
