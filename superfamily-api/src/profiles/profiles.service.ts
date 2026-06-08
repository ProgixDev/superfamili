import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

const PROFILE_PHOTOS_BUCKET = 'profile-photos';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getMyProfile(userId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      throw new BadRequestException('Profil non trouvé');
    }

    let roleProfile = null;
    if (profile.role === 'parent') {
      const { data } = await supabase
        .from('parent_profiles')
        .select('*, children(*)')
        .eq('profile_id', profile.id)
        .single();
      roleProfile = data;
    } else if (profile.role === 'educator') {
      const { data } = await supabase
        .from('educator_profiles')
        .select(
          '*, educator_services(*, services(*)), educator_availability(*)',
        )
        .eq('profile_id', profile.id)
        .single();
      roleProfile = data;
    }

    return { ...profile, role_profile: roleProfile };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const supabase = this.supabaseService.getServiceClient();

    const updateData: any = { ...dto };

    // If lat/lng provided directly (from map picker), build location_point
    if (dto.latitude != null && dto.longitude != null) {
      updateData.location_point = `POINT(${dto.longitude} ${dto.latitude})`;
    }

    // Update location if postal code or city changed (skip if lat/lng already set)
    if (dto.postal_code && dto.latitude == null) {
      const { data: postalData } = await supabase
        .from('postal_codes')
        .select('latitude, longitude, city')
        .eq('postal_code', dto.postal_code)
        .single();

      if (postalData) {
        updateData.latitude = postalData.latitude;
        updateData.longitude = postalData.longitude;
        updateData.location_point = `POINT(${postalData.longitude} ${postalData.latitude})`;
        if (!updateData.city) updateData.city = postalData.city;
      }
    } else if (dto.city && !dto.postal_code && dto.latitude == null) {
      const { data: cityData } = await supabase
        .from('cities')
        .select('latitude, longitude, name')
        .ilike('name', dto.city)
        .limit(1)
        .single();

      if (cityData) {
        updateData.latitude = cityData.latitude;
        updateData.longitude = cityData.longitude;
        updateData.location_point = `POINT(${cityData.longitude} ${cityData.latitude})`;
        updateData.city = cityData.name;
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Erreur lors de la mise à jour du profil');
    }

    return data;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException(
        'Photo trop volumineuse. Taille maximale : 5 Mo.',
      );
    }
    if (!(ALLOWED_AVATAR_MIMES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException(
        'Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.',
      );
    }

    const supabase = this.supabaseService.getServiceClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new BadRequestException('Profil non trouvé');
    }

    const extension = this.avatarExtension(file.mimetype);
    const storageKey = `${profile.id}/${randomUUID()}${extension}`;

    // 3. Upload to storage
    console.log(`[ProfilesService] Uploading avatar for profile ${profile.id} to storage...`);
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(storageKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[ProfilesService] Storage upload failed:`, uploadError);
      throw new InternalServerErrorException(
        "Erreur lors du téléversement de l'image.",
      );
    }

    // 4. Update profile record with public URL
    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(storageKey);

    console.log(`[ProfilesService] Updating profiles table with URL: ${publicUrlData.publicUrl}`);
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq('id', profile.id)
      .select()
      .single();

    if (updateError || !data) {
      console.error(`[ProfilesService] Profiles table update failed:`, updateError);
      // Rollback: delete the uploaded file if database update fails
      await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([storageKey]);
      throw new InternalServerErrorException(
        "Erreur lors de l'enregistrement de la photo dans le profil.",
      );
    }

    console.log(`[ProfilesService] Avatar successfully updated for profile ${profile.id}`);
    return data;
  }

  private avatarExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }
}
