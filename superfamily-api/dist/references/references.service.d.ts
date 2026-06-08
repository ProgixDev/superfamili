import { SupabaseService } from '../supabase/supabase.service';
import { ConsentsService } from '../consents/consents.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
export declare const MIN_REFERENCES_FOR_ACTIVATION = 0;
export declare const MAX_REFERENCES_PER_EDUCATOR = 5;
export interface ReferenceRow {
    id: string;
    educator_id: string;
    full_name: string;
    relationship: string | null;
    phone: string;
    email: string | null;
    address: string;
    testimonial: string;
    verified: boolean;
    verified_at: string | null;
    verified_by: string | null;
    verification_notes: string | null;
    created_at: string;
    updated_at: string;
}
export declare class ReferencesService {
    private readonly supabaseService;
    private readonly consentsService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, consentsService: ConsentsService);
    listForEducator(profileId: string): Promise<ReferenceRow[]>;
    create(profileId: string, dto: CreateReferenceDto): Promise<ReferenceRow>;
    update(profileId: string, referenceId: string, dto: UpdateReferenceDto): Promise<ReferenceRow>;
    delete(profileId: string, referenceId: string): Promise<void>;
    listForAdmin(educatorId: string): Promise<ReferenceRow[]>;
    verify(educatorId: string, referenceId: string, adminProfileId: string, notes: string | undefined): Promise<ReferenceRow>;
    canActivate(profileId: string): Promise<boolean>;
    private normalizePhoneE164;
    private validateSpam;
    private loadOwn;
    private resolveEducatorId;
}
