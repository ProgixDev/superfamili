import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SearchEducatorsDto } from './dto/search-educators.dto';

@Injectable()
export class EducatorsSearchService {
  private readonly logger = new Logger(EducatorsSearchService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async search(dto: SearchEducatorsDto) {
    const supabase = this.supabaseService.getServiceClient();
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    let maxDistanceKm = dto.max_distance_km || 20;
    const sortBy = dto.sort_by || 'relevance';

    let coords: { latitude: number; longitude: number };

    if (dto.postal_code) {
      const { data: postalCodeData, error: postalError } = await supabase
        .from('postal_codes')
        .select('latitude, longitude')
        .eq('postal_code', dto.postal_code)
        .single();

      if (postalError || !postalCodeData) {
        throw new BadRequestException('Code postal non trouvé');
      }
      coords = postalCodeData;
    } else if (dto.city) {
      // Try cities table first, fallback to postal_codes
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('latitude, longitude')
        .ilike('name', dto.city)
        .limit(1)
        .single();

      if (cityError || !cityData) {
        // Fallback to postal_codes table
        const { data: postalCity } = await supabase
          .from('postal_codes')
          .select('latitude, longitude')
          .ilike('city', dto.city)
          .limit(1)
          .single();
        if (!postalCity) {
          throw new BadRequestException('Ville non trouvée');
        }
        coords = postalCity;
      } else {
        coords = cityData;
      }
      if (!dto.max_distance_km) {
        maxDistanceKm = 30;
      }
    } else {
      throw new BadRequestException('Code postal ou ville requis');
    }

    return this.searchByDistance(dto, coords, maxDistanceKm);
  }

  private async searchByDistance(
    dto: SearchEducatorsDto,
    coords: { latitude: number; longitude: number },
    maxDistanceKm: number,
  ) {
    const supabase = this.supabaseService.getServiceClient();
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    // The FK hint is required because educator_profiles has two FKs to
    // profiles (profile_id + license_reviewed_by). Without it PostgREST
    // returns an ambiguous-relationship error.
    let query = supabase
      .from('educator_profiles')
      .select(
        `*,
        profiles!educator_profiles_profile_id_fkey(
          id, first_name, last_name, avatar_url, postal_code, city,
          gender, bio, is_active, is_verified, latitude, longitude
        ),
        educator_services!inner(
          id, service_id, hourly_rate_cents, minimum_booking_hours,
          can_provide_on_weekends, can_provide_overnight,
          services(id, name, category, applicable_age_groups)
        )`,
        { count: 'exact' },
      )
      .eq('profiles.is_active', true)
      .eq('profiles.is_verified', true)
      .eq('educator_services.is_active', true)
      // Hide educators who haven't completed Stripe Connect onboarding —
      // parents would otherwise pick them, fail at the payment step, and
      // see "L'éducateur n'a pas complété son inscription Stripe". The
      // educator UI nudges them to finish onboarding via a prompt on
      // the dashboard; once `account.updated` flips this column to
      // 'active' they re-enter the search results.
      .eq('stripe_account_status', 'active');

    if (dto.service_category) {
      query = query.eq(
        'educator_services.services.category',
        dto.service_category,
      );
    }
    if (dto.gender) {
      query = query.eq('profiles.gender', dto.gender);
    }
    if (dto.min_rating) {
      query = query.gte('average_rating', dto.min_rating);
    }
    if (dto.max_hourly_rate) {
      query = query.lte(
        'educator_services.hourly_rate_cents',
        dto.max_hourly_rate,
      );
    }
    if (dto.special_needs) {
      query = query.eq('special_needs_trained', true);
    }

    switch (dto.sort_by) {
      case 'rating':
        query = query.order('average_rating', { ascending: false });
        break;
      case 'price':
        break;
      default:
        query = query
          .order('average_rating', { ascending: false })
          .order('completion_rate', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Educator search failed: ${error.message}`);
      throw new BadRequestException(
        'Erreur lors de la recherche des éducateurs',
      );
    }

    // Resolve postal codes to city names
    const postalCodes = (data || [])
      .map((e: any) => e.profiles?.postal_code)
      .filter(Boolean);
    const uniquePostalCodes = [...new Set(postalCodes)];

    const postalCityMap: Record<string, string> = {};
    if (uniquePostalCodes.length > 0) {
      const { data: postalData } = await supabase
        .from('postal_codes')
        .select('postal_code, city')
        .in('postal_code', uniquePostalCodes);
      if (postalData) {
        for (const p of postalData) {
          postalCityMap[p.postal_code] = p.city || '';
        }
      }
    }

    // Calculate distances client-side as fallback
    const results = (data || []).map((educator: any) => {
      const profile = educator.profiles;
      let distanceKm = 0;
      if (profile?.latitude && profile?.longitude) {
        distanceKm = this.haversine(
          coords.latitude,
          coords.longitude,
          profile.latitude,
          profile.longitude,
        );
      }
      // Enrich profile with city name (prefer stored city, fallback to postal code lookup)
      const city =
        profile?.city ||
        (profile?.postal_code ? postalCityMap[profile.postal_code] : '') ||
        '';
      return {
        ...educator,
        profiles: { ...profile, city },
        distance_km: Math.round(distanceKm * 100) / 100,
      };
    });

    // Filter by distance
    const filtered = results.filter((e: any) => e.distance_km <= maxDistanceKm);

    // Sort by distance or price if requested
    if (dto.sort_by === 'distance') {
      filtered.sort((a: any, b: any) => a.distance_km - b.distance_km);
    } else if (dto.sort_by === 'price') {
      filtered.sort((a: any, b: any) => {
        const aRate = a.educator_services?.[0]?.hourly_rate_cents || 0;
        const bRate = b.educator_services?.[0]?.hourly_rate_cents || 0;
        return aRate - bRate;
      });
    }

    return {
      data: filtered,
      meta: {
        page,
        limit,
        total: count || filtered.length,
        totalPages: Math.ceil((count || filtered.length) / limit),
      },
    };
  }

  private haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Autocomplete cities from the postal_codes table.
   * Returns distinct city names matching the query prefix.
   */
  async autocompleteCities(query: string, limit = 10) {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('postal_codes')
      .select('city, province')
      .ilike('city', `${query}%`)
      .not('city', 'is', null)
      .order('city', { ascending: true })
      .limit(50);

    if (error) {
      return [];
    }

    // Deduplicate by city+province
    const seen = new Set<string>();
    const unique: { city: string; province: string }[] = [];
    for (const row of data || []) {
      const key = `${row.city}-${row.province}`;
      if (!seen.has(key) && row.city) {
        seen.add(key);
        unique.push({ city: row.city, province: row.province });
        if (unique.length >= limit) break;
      }
    }

    return unique;
  }
}
