import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupInitDto {
  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail({}, { message: "L'adresse courriel est invalide" })
  email: string;

  @ApiProperty({ example: 'SuperSecret123' })
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  password: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @MaxLength(50)
  first_name: string;

  @ApiProperty({ example: 'Dupont', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  last_name?: string;
}
