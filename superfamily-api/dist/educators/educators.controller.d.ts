import { EducatorsService } from './educators.service';
import { EducatorsSearchService } from './educators-search.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { UpdateEducatorProfileDto } from './dto/update-educator-profile.dto';
import { CreateEducatorServiceDto } from './dto/create-educator-service.dto';
import { SetAvailabilityDto, CreateAvailabilityOverrideDto } from './dto/set-availability.dto';
import { SearchEducatorsDto } from './dto/search-educators.dto';
import { OnboardingStepDto } from './dto/onboarding-step.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
export declare class EducatorsController {
    private readonly educatorsService;
    private readonly searchService;
    constructor(educatorsService: EducatorsService, searchService: EducatorsSearchService);
    getCities(): Promise<{
        id: any;
        name: any;
        province: any;
        latitude: any;
        longitude: any;
    }[]>;
    geocode(query: string): Promise<{
        latitude: any;
        longitude: any;
        address: string;
        city: any;
    } | null>;
    autocompleteCities(query: string, limit?: string): Promise<{
        city: string;
        province: string;
    }[]>;
    getServicesCatalog(): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
    }[]>;
    search(dto: SearchEducatorsDto): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getMyProfile(user: AuthUser): Promise<any>;
    getPublicProfile(id: string): Promise<any>;
    getBusyRanges(id: string, from: string, to: string): Promise<{
        start: string;
        end: string;
    }[]>;
    updateMyProfile(user: AuthUser, dto: UpdateEducatorProfileDto): Promise<any>;
    addService(user: AuthUser, dto: CreateEducatorServiceDto): Promise<any>;
    removeService(user: AuthUser, serviceId: string): Promise<{
        message: string;
    }>;
    setAvailability(user: AuthUser, dto: SetAvailabilityDto): Promise<any[]>;
    addAvailabilityOverride(user: AuthUser, dto: CreateAvailabilityOverrideDto): Promise<any>;
    completeOnboarding(user: AuthUser, step: string, dto: OnboardingStepDto): Promise<any>;
    submitLicense(user: AuthUser, dto: UpdateLicenseDto, file?: Express.Multer.File): Promise<{
        id: any;
        license_status: any;
    }>;
}
