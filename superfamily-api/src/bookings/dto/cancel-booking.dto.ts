import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}
