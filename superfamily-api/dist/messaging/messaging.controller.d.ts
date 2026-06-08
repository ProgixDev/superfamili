import { MessagingService } from './messaging.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { SendMessageDto } from './dto/send-message.dto';
export declare class MessagingController {
    private readonly messagingService;
    constructor(messagingService: MessagingService);
    getConversations(user: AuthUser): Promise<any[]>;
    getMessages(user: AuthUser, conversationId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    sendMessage(user: AuthUser, educatorId: string, dto: SendMessageDto): Promise<any>;
    markAsRead(user: AuthUser, conversationId: string): Promise<{
        message: string;
    }>;
}
