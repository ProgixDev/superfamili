import { SupabaseService } from '../supabase/supabase.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class MessagingService {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    getConversations(profileId: string, role: string): Promise<any[]>;
    getMessages(conversationId: string, profileId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    sendMessage(profileId: string, role: string, educatorProfileId: string, dto: SendMessageDto): Promise<any>;
    markAsRead(conversationId: string, profileId: string, role: string): Promise<{
        message: string;
    }>;
}
