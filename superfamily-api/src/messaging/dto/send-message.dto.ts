import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le contenu du message est requis' })
  content: string;

  @ApiProperty({ enum: ['text', 'image', 'file'], default: 'text' })
  @IsOptional()
  @IsEnum(['text', 'image', 'file'])
  message_type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  media_url?: string;
}
