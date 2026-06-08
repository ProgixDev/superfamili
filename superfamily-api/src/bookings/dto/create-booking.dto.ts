import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID('4', { message: "ID d'éducateur invalide" })
  educator_profile_id: string;

  @ApiProperty()
  @IsUUID('4', { message: 'ID de service invalide' })
  service_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  child_id?: string;

  @ApiProperty({ example: '2026-04-01T09:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  booking_date_start: string;

  @ApiProperty({ example: '2026-04-01T12:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  booking_date_end: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(0.5, { message: 'La durée minimale est de 30 minutes' })
  duration_hours: number;

  @ApiProperty({ example: 'H2X 1Y4', required: false })
  @IsOptional()
  @IsString()
  location_postal_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  special_requests?: string;
}
