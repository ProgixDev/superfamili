import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(profileId: string, dto: CreateReviewDto) {
    const supabase = this.supabaseService.getServiceClient();

    // Get parent profile
    const { data: parentProfile } = await supabase
      .from('parent_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (!parentProfile) {
      throw new BadRequestException('Profil parent non trouvé');
    }

    // Verify booking exists, is completed, and belongs to parent
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', dto.booking_id)
      .eq('parent_profile_id', parentProfile.id)
      .eq('status', 'completed')
      .single();

    if (!booking) {
      throw new BadRequestException('Réservation invalide ou non complétée');
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', dto.booking_id)
      .single();

    if (existingReview) {
      throw new BadRequestException(
        'Un avis a déjà été laissé pour cette réservation',
      );
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        booking_id: dto.booking_id,
        parent_profile_id: parentProfile.id,
        educator_profile_id: booking.educator_profile_id,
        rating: dto.rating,
        review_text: dto.review_text,
        cleanliness_rating: dto.cleanliness_rating,
        communication_rating: dto.communication_rating,
        reliability_rating: dto.reliability_rating,
        engagement_rating: dto.engagement_rating,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException("Erreur lors de la création de l'avis");
    }

    // Notify educator
    const { data: edProfile } = await supabase
      .from('educator_profiles')
      .select('profile_id')
      .eq('id', booking.educator_profile_id)
      .single();

    if (edProfile) {
      await this.notificationsService.create({
        profile_id: edProfile.profile_id,
        notification_type: 'rating_received',
        title: 'Nouvel avis reçu',
        message: `Vous avez reçu un avis de ${dto.rating} étoile(s).`,
        related_booking_id: dto.booking_id,
      });
    }

    return data;
  }

  async findByEducator(educatorProfileId: string, page = 1, limit = 20) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('reviews')
      .select(
        '*, parent_profiles(profiles(first_name, last_name, avatar_url))',
        { count: 'exact' },
      )
      .eq('educator_profile_id', educatorProfileId)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new NotFoundException('Éducateur non trouvé');
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
}
