import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsUUID('4')
  profile_id: string;

  @ApiProperty()
  @IsEnum([
    'booking_confirmed',
    'booking_cancelled',
    'booking_reminder',
    'review_request',
    'payment_received',
    'payout_completed',
    'new_message',
    'service_completed',
    'educator_nearby',
    'rating_received',
    'profile_verification_status',
    'document_review',
    'license_review',
    'license_approved',
    'license_rejected',
    'dispute_opened',
    'system_alert',
  ])
  notification_type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  related_booking_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  related_conversation_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  data?: Record<string, any>;
}
