"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let MessagingService = class MessagingService {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getConversations(profileId, role) {
        const supabase = this.supabaseService.getServiceClient();
        let query;
        if (role === 'parent') {
            const { data: pp } = await supabase
                .from('parent_profiles')
                .select('id')
                .eq('profile_id', profileId)
                .single();
            if (!pp)
                return [];
            query = supabase
                .from('conversations')
                .select(`*, educator_profiles(profiles!educator_profiles_profile_id_fkey(first_name, last_name, avatar_url))`)
                .eq('parent_profile_id', pp.id)
                .eq('is_active', true)
                .order('last_message_at', { ascending: false });
        }
        else {
            const { data: ep } = await supabase
                .from('educator_profiles')
                .select('id')
                .eq('profile_id', profileId)
                .single();
            if (!ep)
                return [];
            query = supabase
                .from('conversations')
                .select(`*, parent_profiles(profiles(first_name, last_name, avatar_url))`)
                .eq('educator_profile_id', ep.id)
                .eq('is_active', true)
                .order('last_message_at', { ascending: false });
        }
        const { data, error } = await query;
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des conversations');
        }
        return data;
    }
    async getMessages(conversationId, profileId, page = 1, limit = 50) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des messages');
        }
        return {
            data: (data || []).reverse(),
            meta: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }
    async sendMessage(profileId, role, educatorProfileId, dto) {
        const supabase = this.supabaseService.getServiceClient();
        let parentProfileId;
        let edProfileId;
        if (role === 'parent') {
            const { data: pp } = await supabase
                .from('parent_profiles')
                .select('id')
                .eq('profile_id', profileId)
                .single();
            if (!pp)
                throw new common_1.BadRequestException('Profil parent non trouvé');
            parentProfileId = pp.id;
            edProfileId = educatorProfileId;
        }
        else {
            const { data: ep } = await supabase
                .from('educator_profiles')
                .select('id')
                .eq('profile_id', profileId)
                .single();
            if (!ep)
                throw new common_1.BadRequestException("Profil d'éducateur non trouvé");
            edProfileId = ep.id;
            parentProfileId = educatorProfileId;
        }
        let { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('parent_profile_id', parentProfileId)
            .eq('educator_profile_id', edProfileId)
            .single();
        if (!conversation) {
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                parent_profile_id: parentProfileId,
                educator_profile_id: edProfileId,
            })
                .select()
                .single();
            if (convError) {
                throw new common_1.BadRequestException('Erreur lors de la création de la conversation');
            }
            conversation = newConv;
        }
        const { data: message, error } = await supabase
            .from('messages')
            .insert({
            conversation_id: conversation.id,
            sender_profile_id: profileId,
            content: dto.content,
            message_type: dto.message_type || 'text',
            media_url: dto.media_url,
        })
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de l'envoi du message");
        }
        const unreadField = role === 'parent' ? 'educator_unread_count' : 'parent_unread_count';
        const { data: conv } = await supabase
            .from('conversations')
            .select('educator_unread_count, parent_unread_count')
            .eq('id', conversation.id)
            .single();
        if (conv) {
            const currentCount = conv[unreadField] || 0;
            await supabase
                .from('conversations')
                .update({ [unreadField]: currentCount + 1 })
                .eq('id', conversation.id);
        }
        return message;
    }
    async markAsRead(conversationId, profileId, role) {
        const supabase = this.supabaseService.getServiceClient();
        const unreadField = role === 'parent' ? 'parent_unread_count' : 'educator_unread_count';
        await supabase
            .from('conversations')
            .update({ [unreadField]: 0 })
            .eq('id', conversationId);
        await supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .neq('sender_profile_id', profileId)
            .eq('is_read', false);
        return { message: 'Conversation marquée comme lue' };
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], MessagingService);
//# sourceMappingURL=messaging.service.js.map