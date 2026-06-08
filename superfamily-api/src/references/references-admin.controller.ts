import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferencesService } from './references.service';
import { VerifyReferenceDto } from './dto/verify-reference.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

/**
 * Admin-only reference endpoints. Routes nested under
 * `/admin/educators/:educatorId/references/*` so admins can view/verify
 * references for a specific educator profile.
 */
@ApiTags('Admin — References')
@Controller('admin/educators/:educatorId/references')
@Roles('admin')
export class ReferencesAdminController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les références d’un éducateur' })
  async list(@Param('educatorId', new ParseUUIDPipe()) educatorId: string) {
    return this.referencesService.listForAdmin(educatorId);
  }

  @Patch(':refId/verify')
  @ApiOperation({ summary: 'Marquer une référence comme vérifiée' })
  async verify(
    @CurrentUser() user: AuthUser,
    @Param('educatorId', new ParseUUIDPipe()) educatorId: string,
    @Param('refId', new ParseUUIDPipe()) refId: string,
    @Body() dto: VerifyReferenceDto,
  ) {
    return this.referencesService.verify(
      educatorId,
      refId,
      user.profileId!,
      dto.notes,
    );
  }
}
