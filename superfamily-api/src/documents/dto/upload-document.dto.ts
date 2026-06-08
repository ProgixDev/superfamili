import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

/**
 * Body fields sent alongside the file in the multipart form data.
 *
 * The file itself is picked up by `@UploadedFile()` on the controller — this
 * DTO only covers the string/date fields. `class-validator` applies to the
 * string fields via the global `ValidationPipe`.
 */
export class UploadDocumentDto {
  @ApiProperty({
    enum: [
      'background_check',
      'birth_certificate',
      'cpr_certification',
      'work_authorization',
      'secondary_id',
      'diploma',
    ],
    description: 'Type of document being uploaded.',
  })
  @IsEnum(
    [
      'background_check',
      'birth_certificate',
      'cpr_certification',
      'work_authorization',
      'secondary_id',
      'diploma',
    ],
    {
      message:
        'Type de document invalide. Valeurs acceptées : background_check, birth_certificate, cpr_certification, work_authorization, secondary_id, diploma.',
    },
  )
  type:
    | 'background_check'
    | 'birth_certificate'
    | 'cpr_certification'
    | 'work_authorization'
    | 'secondary_id'
    | 'diploma';

  @ApiProperty({
    required: false,
    description:
      'Issue date of the document (YYYY-MM-DD). Used to compute expires_at. Required for background_check and cpr_certification.',
    example: '2026-02-15',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: "La date d'émission doit être au format YYYY-MM-DD." },
  )
  issued_date?: string;
}
