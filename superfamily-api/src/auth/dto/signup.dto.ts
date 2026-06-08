import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  first_name: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  last_name: string;

  @ApiProperty({ enum: ['parent', 'educator', 'admin'] })
  @IsEnum(['parent', 'educator', 'admin'], {
    message: 'Le rôle doit être parent, educator ou admin',
  })
  role: 'parent' | 'educator' | 'admin';

  @ApiProperty({ example: 'H2X 1Y4', required: false })
  @IsOptional()
  @Matches(/^[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]$/, {
    message: 'Format de code postal invalide (ex: H2X 1Y4)',
  })
  postal_code?: string;

  @ApiProperty({ example: 'Montréal', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: '514-555-1234', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
