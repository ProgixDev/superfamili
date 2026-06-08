import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'nouvelle@example.com' })
  @IsEmail({}, { message: "L'adresse courriel est invalide" })
  new_email: string;
}
