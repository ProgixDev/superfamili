import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferencesService } from './references.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

/**
 * Educator-facing reference endpoints.
 *
 * Routes live under `/educators/me/references` to match the existing
 * `/educators/me/*` convention (services, availability, etc.) in
 * `EducatorsController` — same resource namespace, just a new sub-path.
 *
 * All routes require the `educator` role. The class-level decorator
 * enforces it so individual methods can't accidentally leak.
 */
@ApiTags('Educator References')
@Controller('educators/me/references')
@Roles('educator')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes références' })
  async list(@CurrentUser() user: AuthUser) {
    return this.referencesService.listForEducator(user.profileId!);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle référence' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateReferenceDto) {
    return this.referencesService.create(user.profileId!, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour une référence (uniquement si non vérifiée)',
  })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReferenceDto,
  ) {
    return this.referencesService.update(user.profileId!, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer une référence (uniquement si non vérifiée)',
  })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.referencesService.delete(user.profileId!, id);
  }

  @Get('can-activate/status')
  @ApiOperation({
    summary: "Retourne whether les références bloquent l'activation du compte",
  })
  async canActivate(@CurrentUser() user: AuthUser) {
    const ok = await this.referencesService.canActivate(user.profileId!);
    return { can_activate: ok };
  }
}
