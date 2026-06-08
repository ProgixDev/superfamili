import { ParentsService } from './parents.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateParentProfileDto } from './dto/update-parent-profile.dto';
export declare class ParentsController {
    private readonly parentsService;
    constructor(parentsService: ParentsService);
    getMyProfile(user: AuthUser): Promise<any>;
    updateMyProfile(user: AuthUser, dto: UpdateParentProfileDto): Promise<any>;
    addChild(user: AuthUser, dto: CreateChildDto): Promise<any>;
    updateChild(user: AuthUser, childId: string, dto: Partial<CreateChildDto>): Promise<any>;
    removeChild(user: AuthUser, childId: string): Promise<{
        message: string;
    }>;
}
