import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

/**
 * Validation for creating a new educator reference.
 *
 * Phone format: the regex accepts the three common Canadian formats
 * (`+1 XXX XXX XXXX`, `(XXX) XXX-XXXX`, `XXX-XXX-XXXX`) plus loose
 * variants with extra whitespace. The service layer normalizes to
 * E.164 (+1XXXXXXXXXX) after validation.
 *
 * Spam filter: the service scans `testimonial` for URLs and email
 * addresses and throws on match — we don't regex that in the DTO
 * because class-validator's message for a `@Matches` rejection would
 * be cryptic. Keeping it at the service layer lets us return a
 * clearer error.
 */
export class CreateReferenceDto {
  @ApiProperty({ example: 'Marie Tremblay', minLength: 2, maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est requis.' })
  @Length(2, 100, {
    message: 'Le nom doit contenir entre 2 et 100 caractères.',
  })
  full_name: string;

  @ApiProperty({
    required: false,
    description:
      'Nature of the relationship (employer, colleague, family friend, etc.).',
    example: 'Ancien employeur',
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  relationship?: string;

  @ApiProperty({
    description:
      'Canadian phone number. Accepted: +1 XXX XXX XXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX.',
    example: '(514) 555-1234',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis.' })
  // One regex that accepts the three documented formats and a few loose
  // variants. The spaces are optional; parens and dashes are optional
  // individually. The 10-digit stripped form is what the service actually
  // stores (as +1XXXXXXXXXX).
  @Matches(/^(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/, {
    message:
      'Format de téléphone invalide. Utilisez (XXX) XXX-XXXX ou +1 XXX XXX XXXX.',
  })
  phone: string;

  @ApiProperty({ required: false, example: 'marie.tremblay@example.ca' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse courriel invalide.' })
  email?: string;

  @ApiProperty({ example: '123 rue Saint-Denis, Montréal, QC H2X 3K8' })
  @IsString()
  @IsNotEmpty({ message: "L'adresse est requise." })
  @Length(5, 300)
  address: string;

  @ApiProperty({
    minLength: 50,
    maxLength: 1000,
    description:
      'Testimonial — must not contain URLs or email addresses (anti-spam).',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le témoignage est requis.' })
  @Length(50, 1000, {
    message: 'Le témoignage doit contenir entre 50 et 1000 caractères.',
  })
  testimonial: string;
}
