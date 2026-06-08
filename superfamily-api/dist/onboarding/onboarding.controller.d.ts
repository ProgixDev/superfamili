import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class OnboardingController {
    private readonly onboardingService;
    constructor(onboardingService: OnboardingService);
    getMine(user: AuthUser): Promise<import("./onboarding.service").OnboardingRow>;
    updateMine(user: AuthUser, dto: UpdateOnboardingDto): Promise<import("./onboarding.service").OnboardingRow>;
}
