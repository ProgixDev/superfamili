import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail({}, { message: "L'adresse courriel est invalide" })
  email: string;
}
