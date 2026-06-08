import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateParentProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  number_of_children?: number;

  @ApiProperty({
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'prefer_not_to_say'])
  preferred_educator_gender?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  preferred_service_types?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_distance_km?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  budget_min_hourly_cents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  budget_max_hourly_cents?: number;

  @ApiProperty({ enum: ['in_app', 'email', 'both'], required: false })
  @IsOptional()
  @IsEnum(['in_app', 'email', 'both'])
  preferred_notification_channel?: string;
}
