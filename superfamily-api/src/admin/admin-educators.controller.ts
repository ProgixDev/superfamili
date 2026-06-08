import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { AdminEducatorsService } from './admin-educators.service';
import { ReviewLicenseDto } from './dto/review-license.dto';

/**
 * Admin endpoints for the educator license workflow.
 *
 * All endpoints require admin role (`@Roles('admin')`). The global
 * `SupabaseAuthGuard` + `RolesGuard` chain enforces this.
 */
@ApiTags('Admin — Educators')
@Controller('admin/educators')
@Roles('admin')
export class AdminEducatorsController {
  constructor(private readonly adminEducatorsService: AdminEducatorsService) {}

  @Get('licenses/pending')
  @ApiOperation({
    summary: 'Lister les permis gouvernementaux en attente de révision',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listPendingLicenses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminEducatorsService.listPendingLicenses(
      page || 1,
      limit || 20,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les éducateurs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listEducators(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminEducatorsService.listEducators(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
    );
  }

  @Patch('licenses/:educatorProfileId')
  @ApiOperation({
    summary: 'Approuver ou rejeter un permis gouvernemental',
  })
  async reviewLicense(
    @CurrentUser() user: AuthUser,
    @Param('educatorProfileId', new ParseUUIDPipe()) educatorProfileId: string,
    @Body() dto: ReviewLicenseDto,
  ) {
    if (dto.action === 'approve') {
      return this.adminEducatorsService.approveLicense(
        educatorProfileId,
        user.profileId!,
      );
    }
    return this.adminEducatorsService.rejectLicense(
      educatorProfileId,
      user.profileId!,
      dto.reason || '',
    );
  }
}
