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
var EducatorsSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EducatorsSearchService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let EducatorsSearchService = EducatorsSearchService_1 = class EducatorsSearchService {
    supabaseService;
    logger = new common_1.Logger(EducatorsSearchService_1.name);
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async search(dto) {
        const supabase = this.supabaseService.getServiceClient();
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        let maxDistanceKm = dto.max_distance_km || 20;
        const sortBy = dto.sort_by || 'relevance';
        let coords;
        if (dto.postal_code) {
            const { data: postalCodeData, error: postalError } = await supabase
                .from('postal_codes')
                .select('latitude, longitude')
                .eq('postal_code', dto.postal_code)
                .single();
            if (postalError || !postalCodeData) {
                throw new common_1.BadRequestException('Code postal non trouvé');
            }
            coords = postalCodeData;
        }
        else if (dto.city) {
            const { data: cityData, error: cityError } = await supabase
                .from('cities')
                .select('latitude, longitude')
                .ilike('name', dto.city)
                .limit(1)
                .single();
            if (cityError || !cityData) {
                const { data: postalCity } = await supabase
                    .from('postal_codes')
                    .select('latitude, longitude')
                    .ilike('city', dto.city)
                    .limit(1)
                    .single();
                if (!postalCity) {
                    throw new common_1.BadRequestException('Ville non trouvée');
                }
                coords = postalCity;
            }
            else {
                coords = cityData;
            }
            if (!dto.max_distance_km) {
                maxDistanceKm = 30;
            }
        }
        else {
            throw new common_1.BadRequestException('Code postal ou ville requis');
        }
        return this.searchByDistance(dto, coords, maxDistanceKm);
    }
    async searchByDistance(dto, coords, maxDistanceKm) {
        const supabase = this.supabaseService.getServiceClient();
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const offset = (page - 1) * limit;
        let query = supabase
            .from('educator_profiles')
            .select(`*,
        profiles!educator_profiles_profile_id_fkey(
          id, first_name, last_name, avatar_url, postal_code, city,
          gender, bio, is_active, is_verified, latitude, longitude
        ),
        educator_services!inner(
          id, service_id, hourly_rate_cents, minimum_booking_hours,
          can_provide_on_weekends, can_provide_overnight,
          services(id, name, category, applicable_age_groups)
        )`, { count: 'exact' })
            .eq('profiles.is_active', true)
            .eq('profiles.is_verified', true)
            .eq('educator_services.is_active', true)
            .eq('stripe_account_status', 'active');
        if (dto.service_category) {
            query = query.eq('educator_services.services.category', dto.service_category);
        }
        if (dto.gender) {
            query = query.eq('profiles.gender', dto.gender);
        }
        if (dto.min_rating) {
            query = query.gte('average_rating', dto.min_rating);
        }
        if (dto.max_hourly_rate) {
            query = query.lte('educator_services.hourly_rate_cents', dto.max_hourly_rate);
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
            throw new common_1.BadRequestException('Erreur lors de la recherche des éducateurs');
        }
        const postalCodes = (data || [])
            .map((e) => e.profiles?.postal_code)
            .filter(Boolean);
        const uniquePostalCodes = [...new Set(postalCodes)];
        const postalCityMap = {};
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
        const results = (data || []).map((educator) => {
            const profile = educator.profiles;
            let distanceKm = 0;
            if (profile?.latitude && profile?.longitude) {
                distanceKm = this.haversine(coords.latitude, coords.longitude, profile.latitude, profile.longitude);
            }
            const city = profile?.city ||
                (profile?.postal_code ? postalCityMap[profile.postal_code] : '') ||
                '';
            return {
                ...educator,
                profiles: { ...profile, city },
                distance_km: Math.round(distanceKm * 100) / 100,
            };
        });
        const filtered = results.filter((e) => e.distance_km <= maxDistanceKm);
        if (dto.sort_by === 'distance') {
            filtered.sort((a, b) => a.distance_km - b.distance_km);
        }
        else if (dto.sort_by === 'price') {
            filtered.sort((a, b) => {
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
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
                Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(deg) {
        return deg * (Math.PI / 180);
    }
    async autocompleteCities(query, limit = 10) {
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
        const seen = new Set();
        const unique = [];
        for (const row of data || []) {
            const key = `${row.city}-${row.province}`;
            if (!seen.has(key) && row.city) {
                seen.add(key);
                unique.push({ city: row.city, province: row.province });
                if (unique.length >= limit)
                    break;
            }
        }
        return unique;
    }
};
exports.EducatorsSearchService = EducatorsSearchService;
exports.EducatorsSearchService = EducatorsSearchService = EducatorsSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], EducatorsSearchService);
//# sourceMappingURL=educators-search.service.js.map