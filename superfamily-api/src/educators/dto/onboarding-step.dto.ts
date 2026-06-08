import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class OnboardingStepDto {
  @ApiProperty({
    enum: [
      'identity_verification',
      'profile',
      'credentials',
      'services_availability',
      'pricing_banking',
      'activation',
    ],
  })
  @IsEnum([
    'identity_verification',
    'profile',
    'credentials',
    'services_availability',
    'pricing_banking',
    'activation',
  ])
  step: string;

  @ApiProperty({ required: false })
  @IsOptional()
  data?: Record<string, any>;
}
