import { ReferencesService } from './references.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class ReferencesController {
    private readonly referencesService;
    constructor(referencesService: ReferencesService);
    list(user: AuthUser): Promise<import("./references.service").ReferenceRow[]>;
    create(user: AuthUser, dto: CreateReferenceDto): Promise<import("./references.service").ReferenceRow>;
    update(user: AuthUser, id: string, dto: UpdateReferenceDto): Promise<import("./references.service").ReferenceRow>;
    delete(user: AuthUser, id: string): Promise<void>;
    canActivate(user: AuthUser): Promise<{
        can_activate: boolean;
    }>;
}
