import { SupabaseService } from '../supabase/supabase.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateParentProfileDto } from './dto/update-parent-profile.dto';
export declare class ParentsService {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    private getParentProfileId;
    getMyProfile(profileId: string): Promise<any>;
    updateMyProfile(profileId: string, dto: UpdateParentProfileDto): Promise<any>;
    addChild(profileId: string, dto: CreateChildDto): Promise<any>;
    updateChild(profileId: string, childId: string, dto: Partial<CreateChildDto>): Promise<any>;
    removeChild(profileId: string, childId: string): Promise<{
        message: string;
    }>;
}
