import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Messaging')
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Lister mes conversations' })
  async getConversations(@CurrentUser() user: AuthUser) {
    return this.messagingService.getConversations(user.profileId!, user.role);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: "Obtenir les messages d'une conversation" })
  async getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.getMessages(
      conversationId,
      user.profileId!,
      page || 1,
      limit || 50,
    );
  }

  @Post('conversations/:educatorId/messages')
  @ApiOperation({ summary: 'Envoyer un message' })
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('educatorId') educatorId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(
      user.profileId!,
      user.role,
      educatorId,
      dto,
    );
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Marquer une conversation comme lue' })
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
  ) {
    return this.messagingService.markAsRead(
      conversationId,
      user.profileId!,
      user.role,
    );
  }
}
