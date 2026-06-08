import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body for `PATCH /admin/documents/:id/reject`. Approve has no body so it
 * doesn't need a DTO.
 */
export class RejectDocumentDto {
  @ApiProperty({
    description:
      'Motif du rejet. Stored on the document row and sent to the educator in the rejection notification.',
    example: 'Document illisible.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Une raison de rejet est requise.' })
  @MaxLength(1000)
  reason: string;
}
