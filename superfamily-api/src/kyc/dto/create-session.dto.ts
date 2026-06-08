import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Body for `POST /kyc/session`. Empty in the common case — the user ID is
 * resolved from the JWT (`@CurrentUser()`), not the body. Clients may
 * optionally pass a language preference which is forwarded to Didit.
 */
export class CreateSessionDto {
  @ApiProperty({
    required: false,
    description:
      'ISO 639-1 language code forwarded to Didit. Auto-detected if omitted.',
    example: 'fr',
  })
  @IsOptional()
  @IsString()
  @IsIn(['fr', 'en', 'es', 'de', 'it', 'pt'])
  language?: string;
}
