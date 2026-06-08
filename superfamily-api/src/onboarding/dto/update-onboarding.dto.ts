import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Body for `PATCH /onboarding/me`. All three fields are optional —
 * callers typically send just one at a time:
 *
 *   - `completed_steps`: replaces the array (UNION semantics are done
 *                        client-side — we always REPLACE on the server,
 *                        keeping the row authoritative)
 *   - `skipped`:         true when the user hits "skip the tutorial"
 *   - `completed`:       true when the user finishes the last step. The
 *                        server sets `tutorial_completed_at = now()` in
 *                        that case.
 */
export class UpdateOnboardingDto {
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completed_steps?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  skipped?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
