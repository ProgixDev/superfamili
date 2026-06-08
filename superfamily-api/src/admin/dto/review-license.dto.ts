import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Payload for `PATCH /admin/educators/licenses/:id`.
 *
 * `approve` does not require a reason. `reject` requires a non-empty reason
 * (which is stored on the educator profile and sent to the educator in the
 * rejection notification).
 */
export class ReviewLicenseDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'], {
    message: "L'action doit être 'approve' ou 'reject'.",
  })
  action: 'approve' | 'reject';

  @ApiProperty({
    required: false,
    description:
      'Motif du rejet. Requis quand action = reject, stocké sur le profil éducateur et envoyé dans la notification.',
  })
  @ValidateIf((o) => o.action === 'reject')
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;
}
