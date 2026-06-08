import { SupabaseService } from '../supabase/supabase.service';
import { SearchEducatorsDto } from './dto/search-educators.dto';
export declare class EducatorsSearchService {
    private readonly supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    search(dto: SearchEducatorsDto): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    private searchByDistance;
    private haversine;
    private toRad;
    autocompleteCities(query: string, limit?: number): Promise<{
        city: string;
        province: string;
    }[]>;
}
