import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateParentProfileDto } from './dto/update-parent-profile.dto';

@ApiTags('Parents')
@Controller('parents')
@Roles('parent')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtenir mon profil parent' })
  async getMyProfile(@CurrentUser() user: AuthUser) {
    return this.parentsService.getMyProfile(user.profileId!);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Mettre à jour mon profil parent' })
  async updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateParentProfileDto,
  ) {
    return this.parentsService.updateMyProfile(user.profileId!, dto);
  }

  @Post('children')
  @ApiOperation({ summary: 'Ajouter un enfant' })
  async addChild(@CurrentUser() user: AuthUser, @Body() dto: CreateChildDto) {
    return this.parentsService.addChild(user.profileId!, dto);
  }

  @Patch('children/:id')
  @ApiOperation({ summary: 'Mettre à jour un enfant' })
  async updateChild(
    @CurrentUser() user: AuthUser,
    @Param('id') childId: string,
    @Body() dto: Partial<CreateChildDto>,
  ) {
    return this.parentsService.updateChild(user.profileId!, childId, dto);
  }

  @Delete('children/:id')
  @ApiOperation({ summary: 'Supprimer un enfant' })
  async removeChild(
    @CurrentUser() user: AuthUser,
    @Param('id') childId: string,
  ) {
    return this.parentsService.removeChild(user.profileId!, childId);
  }
}
