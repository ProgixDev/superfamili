import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateParentProfileDto } from './dto/update-parent-profile.dto';

@Injectable()
export class ParentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getParentProfileId(profileId: string): Promise<string> {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('parent_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (error || !data) {
      throw new ForbiddenException('Profil parent non trouvé');
    }
    return data.id;
  }

  async getMyProfile(profileId: string) {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('parent_profiles')
      .select('*, children(*)')
      .eq('profile_id', profileId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Profil parent non trouvé');
    }
    return data;
  }

  async updateMyProfile(profileId: string, dto: UpdateParentProfileDto) {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('parent_profiles')
      .update(dto)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la mise à jour du profil parent',
      );
    }
    return data;
  }

  async addChild(profileId: string, dto: CreateChildDto) {
    const parentProfileId = await this.getParentProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('children')
      .insert({ ...dto, parent_profile_id: parentProfileId })
      .select()
      .single();

    if (error) {
      throw new BadRequestException("Erreur lors de l'ajout de l'enfant");
    }
    return data;
  }

  async updateChild(
    profileId: string,
    childId: string,
    dto: Partial<CreateChildDto>,
  ) {
    const parentProfileId = await this.getParentProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('children')
      .update(dto)
      .eq('id', childId)
      .eq('parent_profile_id', parentProfileId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        "Erreur lors de la mise à jour de l'enfant",
      );
    }
    return data;
  }

  async removeChild(profileId: string, childId: string) {
    const parentProfileId = await this.getParentProfileId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { error } = await supabase
      .from('children')
      .update({ is_active: false })
      .eq('id', childId)
      .eq('parent_profile_id', parentProfileId);

    if (error) {
      throw new BadRequestException(
        "Erreur lors de la suppression de l'enfant",
      );
    }
    return { message: 'Enfant supprimé avec succès' };
  }
}
