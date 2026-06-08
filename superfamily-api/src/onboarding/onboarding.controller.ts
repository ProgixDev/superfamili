import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

/**
 * User-facing onboarding endpoints. Any authenticated user — parents,
 * educators, admins — hits the same routes; the role-specific step
 * definitions live on the frontend.
 *
 * No `@Roles(...)` decorator so all three roles can use the same
 * endpoints. `SupabaseAuthGuard` still requires a valid JWT globally.
 */
@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('me')
  @ApiOperation({ summary: "État d'onboarding de l'utilisateur authentifié" })
  async getMine(@CurrentUser() user: AuthUser) {
    return this.onboardingService.getMine(user.profileId!);
  }

  @Patch('me')
  @ApiOperation({ summary: "Mettre à jour l'état d'onboarding" })
  async updateMine(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.onboardingService.updateMine(user.profileId!, dto);
  }
}
