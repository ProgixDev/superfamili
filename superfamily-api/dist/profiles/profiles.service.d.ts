import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
export declare class ProfilesService {
    private readonly supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    getMyProfile(userId: string): Promise<any>;
    updateMyProfile(userId: string, dto: UpdateProfileDto): Promise<any>;
    uploadAvatar(userId: string, file: Express.Multer.File | undefined): Promise<any>;
    private avatarExtension;
}
