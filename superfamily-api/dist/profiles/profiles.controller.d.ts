import { ProfilesService } from './profiles.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
export declare class ProfilesController {
    private readonly profilesService;
    constructor(profilesService: ProfilesService);
    getMyProfile(user: AuthUser): Promise<any>;
    updateMyProfile(user: AuthUser, dto: UpdateProfileDto): Promise<any>;
    uploadAvatar(user: AuthUser, file: Express.Multer.File): Promise<any>;
}
