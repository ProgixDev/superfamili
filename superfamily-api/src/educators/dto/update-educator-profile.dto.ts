import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateEducatorProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  years_of_experience?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio_professional?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  certifications?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  service_radius_km?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  special_needs_trained?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  training_commitment?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  special_needs_types?: string[];
}
