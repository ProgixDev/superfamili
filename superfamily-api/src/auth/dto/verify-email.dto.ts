import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail({}, { message: "L'adresse courriel est invalide" })
  email: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code: string;
}
