import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminTransactionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listTransactions(
    page = 1,
    limit = 20,
    status?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const supabase = this.supabaseService.getServiceClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('payments')
      .select(
        // FK hint on the inner profiles join is mandatory: educator_profiles
        // has two FKs to profiles (profile_id + license_reviewed_by); without
        // the hint PostgREST 400s and the admin transactions list is empty.
        '*, bookings(*, parent_profiles(profiles(first_name, last_name)), educator_profiles(profiles!educator_profiles_profile_id_fkey(first_name, last_name)), services(name))',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des transactions',
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

  async getCommissionSummary(period?: string) {
    const supabase = this.supabaseService.getServiceClient();

    const dateFilter = new Date();
    switch (period) {
      case 'week':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case 'month':
        dateFilter.setMonth(dateFilter.getMonth() - 1);
        break;
      case 'year':
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
      default:
        dateFilter.setMonth(dateFilter.getMonth() - 1);
    }

    const { data: bookings } = await supabase
      .from('bookings')
      .select(
        'total_amount_cents, subtotal_cents, platform_commission_cents, educator_earnings_cents, mileage_fee_cents',
      )
      .eq('status', 'completed')
      .gte('created_at', dateFilter.toISOString());

    const summary = (bookings || []).reduce(
      (acc, b) => ({
        total_revenue: acc.total_revenue + b.total_amount_cents,
        total_subtotal: acc.total_subtotal + b.subtotal_cents,
        total_commission: acc.total_commission + b.platform_commission_cents,
        total_educator_earnings:
          acc.total_educator_earnings + b.educator_earnings_cents,
        total_mileage_fees: acc.total_mileage_fees + b.mileage_fee_cents,
        booking_count: acc.booking_count + 1,
      }),
      {
        total_revenue: 0,
        total_subtotal: 0,
        total_commission: 0,
        total_educator_earnings: 0,
        total_mileage_fees: 0,
        booking_count: 0,
      },
    );

    return { period: period || 'month', ...summary };
  }
}
