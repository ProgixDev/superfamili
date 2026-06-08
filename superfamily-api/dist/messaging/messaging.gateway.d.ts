import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
export declare class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly messagingService;
    server: Server;
    private connectedUsers;
    constructor(messagingService: MessagingService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinConversation(client: Socket, data: {
        conversationId: string;
    }): void;
    handleLeaveConversation(client: Socket, data: {
        conversationId: string;
    }): void;
    handleMessage(client: Socket, data: {
        educatorProfileId: string;
        content: string;
        role: string;
    }): Promise<void>;
    handleTyping(client: Socket, data: {
        conversationId: string;
    }): void;
    sendToUser(profileId: string, event: string, data: any): void;
}
