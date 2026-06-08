import { ReferencesService } from './references.service';
import { VerifyReferenceDto } from './dto/verify-reference.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class ReferencesAdminController {
    private readonly referencesService;
    constructor(referencesService: ReferencesService);
    list(educatorId: string): Promise<import("./references.service").ReferenceRow[]>;
    verify(user: AuthUser, educatorId: string, refId: string, dto: VerifyReferenceDto): Promise<import("./references.service").ReferenceRow>;
}
