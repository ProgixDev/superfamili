import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty()
  @IsUUID('4', { message: 'ID de réservation invalide' })
  booking_id: string;
}
