import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  @ApiProperty({ example: 'nouvelle@example.com' })
  @IsEmail({}, { message: "L'adresse courriel est invalide" })
  new_email: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code: string;
}
