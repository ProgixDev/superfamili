import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // socketId -> profileId

  constructor(private readonly messagingService: MessagingService) {}

  handleConnection(client: Socket) {
    const profileId = client.handshake.query.profileId as string;
    if (profileId) {
      this.connectedUsers.set(client.id, profileId);
      client.join(`user:${profileId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      educatorProfileId: string;
      content: string;
      role: string;
    },
  ) {
    const profileId = this.connectedUsers.get(client.id);
    if (!profileId) return;

    const message = await this.messagingService.sendMessage(
      profileId,
      data.role,
      data.educatorProfileId,
      { content: data.content },
    );

    // Broadcast to conversation room
    if (message) {
      this.server
        .to(`conversation:${message.conversation_id}`)
        .emit('new_message', message);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const profileId = this.connectedUsers.get(client.id);
    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      profileId,
      conversationId: data.conversationId,
    });
  }

  // Called by services to push notifications to connected users
  sendToUser(profileId: string, event: string, data: any) {
    this.server.to(`user:${profileId}`).emit(event, data);
  }
}
