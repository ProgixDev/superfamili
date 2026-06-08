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
import {
  DocumentsService,
  type DocumentStatus,
  type DocumentType,
} from './documents.service';
import { RejectDocumentDto } from './dto/review-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

/**
 * Admin-only document review endpoints. Routes live under
 * `/admin/documents` so the admin frontend queries a single consistent
 * namespace (matching the existing AdminController / AdminEducatorsController
 * patterns).
 *
 * Note on role enforcement: `@Roles('admin')` at the class level is
 * intentional — individual endpoints can't accidentally leak to educators
 * even if someone later removes the decorator from a method.
 */
@ApiTags('Admin — Documents')
@Controller('admin/documents')
@Roles('admin')
export class DocumentsAdminController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * `GET /admin/documents?status=pending_review&type=background_check&page=1&limit=20`
   *
   * Paginated list for the admin review queue. Defaults to `pending_review`
   * so the queue shows work-to-do first. Every row includes a 1-hour
   * signed URL so admins can preview the document inline.
   */
  @Get()
  @ApiOperation({ summary: 'Lister les documents pour révision' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.listForAdmin({
      status: (status as DocumentStatus) || undefined,
      type: (type as DocumentType) || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * `PATCH /admin/documents/:id/approve`
   *
   * No body — approval is unconditional. Records the admin's profile id
   * and timestamp, notifies the educator.
   */
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approuver un document' })
  async approve(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.approve(id, user.profileId!);
  }

  /**
   * `PATCH /admin/documents/:id/reject`
   *
   * Body: `{ reason: string }` (required, non-empty). The reason is
   * stored on the row and sent to the educator in the rejection
   * notification verbatim.
   */
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rejeter un document' })
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectDocumentDto,
  ) {
    return this.documentsService.reject(id, user.profileId!, dto.reason);
  }
}
