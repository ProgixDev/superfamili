import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchEducatorsDto {
  @ApiProperty({
    description: 'Code postal du client',
    example: 'H2X 1Y4',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => !o.city)
  @IsString()
  @Matches(/^[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]$/, {
    message: 'Format de code postal invalide',
  })
  postal_code?: string;

  @ApiProperty({
    description: 'Ville de recherche',
    example: 'Montréal',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => !o.postal_code)
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  service_category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  time_start?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  time_end?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'prefer_not_to_say'])
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @Min(0)
  @Max(5)
  min_rating?: number;

  @ApiProperty({ required: false, description: 'Prix max en cents' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  max_hourly_rate?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  max_distance_km?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  special_needs?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  age_group?: string;

  @ApiProperty({
    required: false,
    enum: ['distance', 'rating', 'price', 'relevance'],
    default: 'relevance',
  })
  @IsOptional()
  @IsEnum(['distance', 'rating', 'price', 'relevance'])
  sort_by?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
