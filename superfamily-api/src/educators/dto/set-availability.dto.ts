import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsMilitaryTime,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilitySlotDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0=Lundi, 6=Dimanche' })
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @ApiProperty({ example: '08:00' })
  @IsMilitaryTime({ message: 'Format de temps invalide (HH:MM)' })
  start_time: string;

  @ApiProperty({ example: '17:00' })
  @IsMilitaryTime({ message: 'Format de temps invalide (HH:MM)' })
  end_time: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}

export class CreateAvailabilityOverrideDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  date_start: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  date_end: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @ApiProperty({ required: false, example: '09:00' })
  @IsOptional()
  @IsMilitaryTime()
  start_time?: string;

  @ApiProperty({ required: false, example: '12:00' })
  @IsOptional()
  @IsMilitaryTime()
  end_time?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
