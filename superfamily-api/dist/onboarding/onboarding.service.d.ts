import { SupabaseService } from '../supabase/supabase.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
export interface OnboardingRow {
    user_id: string;
    completed_steps: string[];
    tutorial_skipped: boolean;
    tutorial_completed_at: string | null;
    updated_at: string;
}
export declare class OnboardingService {
    private readonly supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    getMine(profileId: string): Promise<OnboardingRow>;
    updateMine(profileId: string, dto: UpdateOnboardingDto): Promise<OnboardingRow>;
}
