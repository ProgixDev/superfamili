import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(dto: CreateNotificationDto) {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        profile_id: dto.profile_id,
        notification_type: dto.notification_type,
        title: dto.title,
        message: dto.message,
        related_booking_id: dto.related_booking_id,
        related_conversation_id: dto.related_conversation_id,
        data: dto.data || {},
        channel: 'in_app',
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Log error but don't throw — notifications are non-critical
      console.error('Failed to create notification:', error);
      return null;
    }
    return data;
  }

  async findAll(profileId: string, page = 1, limit = 20) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des notifications',
      );
    }

    return {
      data,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async markAsRead(notificationId: string, profileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        'Erreur lors du marquage de la notification',
      );
    }
    return data;
  }

  async markAllAsRead(profileId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('profile_id', profileId)
      .eq('is_read', false);

    if (error) {
      throw new BadRequestException(
        'Erreur lors du marquage des notifications',
      );
    }
    return { message: 'Toutes les notifications ont été marquées comme lues' };
  }
}
