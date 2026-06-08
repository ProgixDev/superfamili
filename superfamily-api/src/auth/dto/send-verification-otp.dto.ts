import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendVerificationOtpDto {
  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail({}, { message: "L'adresse courriel est invalide" })
  email: string;

  @ApiProperty({ example: 'Jean', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  first_name?: string;
}
