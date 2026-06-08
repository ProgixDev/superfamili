import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminUsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listUsers(
    page = 1,
    limit = 20,
    role?: string,
    search?: string,
    isActive?: boolean,
  ) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role) query = query.eq('role', role);
    if (isActive !== undefined) query = query.eq('is_active', isActive);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des utilisateurs',
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

  async updateUserStatus(userId: string, isActive: boolean) {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        "Erreur lors de la mise à jour du statut de l'utilisateur",
      );
    }
    return data;
  }
}
