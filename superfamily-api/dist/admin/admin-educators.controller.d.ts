import { AuthUser } from '../common/interfaces/auth-user.interface';
import { AdminEducatorsService } from './admin-educators.service';
import { ReviewLicenseDto } from './dto/review-license.dto';
export declare class AdminEducatorsController {
    private readonly adminEducatorsService;
    constructor(adminEducatorsService: AdminEducatorsService);
    listPendingLicenses(page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    listEducators(page?: number, limit?: number, search?: string): Promise<{
        data: {
            id: any;
            profile_id: any;
            license_status: any;
            created_at: any;
            profiles: {
                first_name: any;
                last_name: any;
                email: any;
                is_active: any;
            }[];
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    reviewLicense(user: AuthUser, educatorProfileId: string, dto: ReviewLicenseDto): Promise<{
        id: any;
        license_status: any;
        license_reviewed_at: any;
    }>;
}
