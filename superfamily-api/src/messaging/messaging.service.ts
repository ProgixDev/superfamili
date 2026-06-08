import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getConversations(profileId: string, role: string) {
    const supabase = this.supabaseService.getServiceClient();

    let query;
    if (role === 'parent') {
      const { data: pp } = await supabase
        .from('parent_profiles')
        .select('id')
        .eq('profile_id', profileId)
        .single();
      if (!pp) return [];

      // FK hint mandatory on the inner profiles join — educator_profiles
      // has two FKs to profiles (profile_id + license_reviewed_by). Without
      // it PostgREST 400s and the parent's Messages page comes up empty.
      query = supabase
        .from('conversations')
        .select(
          `*, educator_profiles(profiles!educator_profiles_profile_id_fkey(first_name, last_name, avatar_url))`,
        )
        .eq('parent_profile_id', pp.id)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });
    } else {
      const { data: ep } = await supabase
        .from('educator_profiles')
        .select('id')
        .eq('profile_id', profileId)
        .single();
      if (!ep) return [];

      query = supabase
        .from('conversations')
        .select(
          `*, parent_profiles(profiles(first_name, last_name, avatar_url))`,
        )
        .eq('educator_profile_id', ep.id)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des conversations',
      );
    }
    return data;
  }

  async getMessages(
    conversationId: string,
    profileId: string,
    page = 1,
    limit = 50,
  ) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des messages',
      );
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

  async sendMessage(
    profileId: string,
    role: string,
    educatorProfileId: string,
    dto: SendMessageDto,
  ) {
    const supabase = this.supabaseService.getServiceClient();

    // Get or create conversation
    let parentProfileId: string;
    let edProfileId: string;

    if (role === 'parent') {
      const { data: pp } = await supabase
        .from('parent_profiles')
        .select('id')
        .eq('profile_id', profileId)
        .single();
      if (!pp) throw new BadRequestException('Profil parent non trouvé');
      parentProfileId = pp.id;
      edProfileId = educatorProfileId;
    } else {
      const { data: ep } = await supabase
        .from('educator_profiles')
        .select('id')
        .eq('profile_id', profileId)
        .single();
      if (!ep) throw new BadRequestException("Profil d'éducateur non trouvé");
      edProfileId = ep.id;
      // educatorProfileId param is actually the parent_profile_id in this case
      parentProfileId = educatorProfileId;
    }

    // Upsert conversation
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
        throw new BadRequestException(
          'Erreur lors de la création de la conversation',
        );
      }
      conversation = newConv;
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation!.id,
        sender_profile_id: profileId,
        content: dto.content,
        message_type: dto.message_type || 'text',
        media_url: dto.media_url,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException("Erreur lors de l'envoi du message");
    }

    // Update unread count for the other party
    const unreadField =
      role === 'parent' ? 'educator_unread_count' : 'parent_unread_count';

    // Increment unread count for the other party
    const { data: conv } = await supabase
      .from('conversations')
      .select('educator_unread_count, parent_unread_count')
      .eq('id', conversation!.id)
      .single();

    if (conv) {
      const currentCount = (conv as any)[unreadField] || 0;
      await supabase
        .from('conversations')
        .update({ [unreadField]: currentCount + 1 })
        .eq('id', conversation!.id);
    }

    return message;
  }

  async markAsRead(conversationId: string, profileId: string, role: string) {
    const supabase = this.supabaseService.getServiceClient();

    // Reset unread count for the current user
    const unreadField =
      role === 'parent' ? 'parent_unread_count' : 'educator_unread_count';

    await supabase
      .from('conversations')
      .update({ [unreadField]: 0 })
      .eq('id', conversationId);

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_profile_id', profileId)
      .eq('is_read', false);

    return { message: 'Conversation marquée comme lue' };
  }
}
