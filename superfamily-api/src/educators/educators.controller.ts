import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EducatorsService } from './educators.service';
import { EducatorsSearchService } from './educators-search.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { UpdateEducatorProfileDto } from './dto/update-educator-profile.dto';
import { CreateEducatorServiceDto } from './dto/create-educator-service.dto';
import {
  SetAvailabilityDto,
  CreateAvailabilityOverrideDto,
} from './dto/set-availability.dto';
import { SearchEducatorsDto } from './dto/search-educators.dto';
import { OnboardingStepDto } from './dto/onboarding-step.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';

@ApiTags('Educators')
@Controller('educators')
export class EducatorsController {
  constructor(
    private readonly educatorsService: EducatorsService,
    private readonly searchService: EducatorsSearchService,
  ) {}

  @Get('cities')
  @Public()
  @ApiOperation({ summary: 'Lister toutes les villes canadiennes' })
  async getCities() {
    return this.educatorsService.getCities();
  }

  @Get('geocode')
  @Public()
  @ApiOperation({ summary: 'Géocoder une adresse ou code postal' })
  async geocode(@Query('q') query: string) {
    if (!query || query.length < 2) {
      throw new BadRequestException('Requête trop courte');
    }
    return this.educatorsService.geocode(query);
  }

  @Get('cities/autocomplete')
  @Public()
  @ApiOperation({ summary: 'Autocompléter les villes' })
  async autocompleteCities(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.length < 2) return [];
    return this.searchService.autocompleteCities(
      query,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('services-catalog')
  @Public()
  @ApiOperation({ summary: 'Lister le catalogue de services disponibles' })
  async getServicesCatalog() {
    return this.educatorsService.getServicesCatalog();
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Rechercher des éducateurs' })
  async search(@Query() dto: SearchEducatorsDto) {
    return this.searchService.search(dto);
  }

  @Get('me')
  @Roles('educator')
  @ApiOperation({ summary: "Obtenir mon profil d'éducateur" })
  async getMyProfile(@CurrentUser() user: AuthUser) {
    return this.educatorsService.getMyProfile(user.profileId!);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: "Obtenir le profil public d'un éducateur" })
  async getPublicProfile(@Param('id') id: string) {
    return this.educatorsService.getPublicProfile(id);
  }

  /**
   * Public-but-narrow endpoint: returns only the start/end of an educator's
   * active bookings inside the requested window. No parent or child PII is
   * exposed — just the time ranges parents need to see "this slot is taken"
   * before they pick.
   */
  @Get(':id/busy')
  @Public()
  @ApiOperation({
    summary: "Lister les plages occupées d'un éducateur (sans PII)",
  })
  async getBusyRanges(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException(
        '`from` et `to` sont requis (format ISO).',
      );
    }
    // Hard cap at ~6 weeks to prevent slow scans on large datasets.
    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) {
      throw new BadRequestException('Plage `from`/`to` invalide.');
    }
    if (toMs - fromMs > 1000 * 60 * 60 * 24 * 45) {
      throw new BadRequestException('Plage trop large (max 45 jours).');
    }
    return this.educatorsService.getBusyRanges(id, from, to);
  }

  @Patch('me')
  @Roles('educator')
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  async updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEducatorProfileDto,
  ) {
    return this.educatorsService.updateMyProfile(user.profileId!, dto);
  }

  @Post('me/services')
  @Roles('educator')
  @ApiOperation({ summary: 'Ajouter un service offert' })
  async addService(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEducatorServiceDto,
  ) {
    return this.educatorsService.addService(user.profileId!, dto);
  }

  @Delete('me/services/:id')
  @Roles('educator')
  @ApiOperation({ summary: 'Supprimer un service' })
  async removeService(
    @CurrentUser() user: AuthUser,
    @Param('id') serviceId: string,
  ) {
    return this.educatorsService.removeService(user.profileId!, serviceId);
  }

  @Put('me/availability')
  @Roles('educator')
  @ApiOperation({ summary: 'Définir les disponibilités hebdomadaires' })
  async setAvailability(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.educatorsService.setAvailability(user.profileId!, dto);
  }

  @Post('me/availability/overrides')
  @Roles('educator')
  @ApiOperation({ summary: 'Ajouter une exception de disponibilité' })
  async addAvailabilityOverride(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAvailabilityOverrideDto,
  ) {
    return this.educatorsService.addAvailabilityOverride(user.profileId!, dto);
  }

  @Post('me/onboarding/:step')
  @Roles('educator')
  @ApiOperation({ summary: "Compléter une étape d'intégration" })
  async completeOnboarding(
    @CurrentUser() user: AuthUser,
    @Param('step') step: string,
    @Body() dto: OnboardingStepDto,
  ) {
    return this.educatorsService.completeOnboardingStep(
      user.profileId!,
      step,
      dto.data,
    );
  }

  @Post('me/license')
  @Roles('educator')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary:
      'Soumettre un permis gouvernemental pour révision (ou déclarer ne pas en avoir)',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['hasLicense'],
      properties: {
        hasLicense: { type: 'boolean' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async submitLicense(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLicenseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.educatorsService.submitLicense(user.profileId!, dto, file);
  }
}
