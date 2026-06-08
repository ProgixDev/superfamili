import { SupabaseService } from '../supabase/supabase.service';
import { UpdateEducatorProfileDto } from './dto/update-educator-profile.dto';
import { CreateEducatorServiceDto } from './dto/create-educator-service.dto';
import { SetAvailabilityDto, CreateAvailabilityOverrideDto } from './dto/set-availability.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
export declare const LICENSED_CHILD_CAP = 15;
export declare const UNLICENSED_CHILD_CAP = 5;
export type LicenseStatus = 'none' | 'pending' | 'approved' | 'rejected';
export declare class EducatorsService {
    private readonly supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    private getEducatorProfileId;
    geocode(query: string): Promise<{
        latitude: any;
        longitude: any;
        address: string;
        city: any;
    } | null>;
    getCities(): Promise<{
        id: any;
        name: any;
        province: any;
        latitude: any;
        longitude: any;
    }[]>;
    getServicesCatalog(): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
    }[]>;
    getMyProfile(profileId: string): Promise<any>;
    getMaxChildrenForEducator(educatorProfileId: string): Promise<number>;
    submitLicense(profileId: string, dto: UpdateLicenseDto, file: Express.Multer.File | undefined): Promise<{
        id: any;
        license_status: any;
    }>;
    getPublicProfile(educatorProfileId: string): Promise<any>;
    getBusyRanges(educatorProfileId: string, from: string, to: string): Promise<Array<{
        start: string;
        end: string;
    }>>;
    updateMyProfile(profileId: string, dto: UpdateEducatorProfileDto): Promise<any>;
    addService(profileId: string, dto: CreateEducatorServiceDto): Promise<any>;
    removeService(profileId: string, serviceId: string): Promise<{
        message: string;
    }>;
    setAvailability(profileId: string, dto: SetAvailabilityDto): Promise<any[]>;
    addAvailabilityOverride(profileId: string, dto: CreateAvailabilityOverrideDto): Promise<any>;
    completeOnboardingStep(profileId: string, step: string, data?: Record<string, any>): Promise<any>;
}
