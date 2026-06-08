import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateEducatorServiceDto {
  @ApiProperty()
  @IsUUID('4', { message: 'ID de service invalide' })
  service_id: string;

  @ApiProperty({ description: 'Taux horaire en cents CAD', example: 2500 })
  @IsInt({ message: 'Le taux horaire doit être un nombre entier (en cents)' })
  @Min(1, { message: 'Le taux horaire doit être positif' })
  hourly_rate_cents: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  minimum_booking_hours?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  can_provide_on_weekends?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  can_provide_overnight?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  requires_parent_presence?: boolean;
}
