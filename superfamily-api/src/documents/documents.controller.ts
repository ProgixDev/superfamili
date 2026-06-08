import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

/**
 * Educator-facing document endpoints.
 *
 * All routes require a valid JWT (enforced globally by `SupabaseAuthGuard`)
 * plus the `educator` role (enforced by `RolesGuard` via `@Roles`). Admin
 * review endpoints live in `documents-admin.controller.ts`.
 */
@ApiTags('Documents')
@Controller('documents')
@Roles('educator')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * `POST /documents/upload`
   *
   * Multipart form data:
   *   - `file` (binary): the document itself. Max 10 MB. PDF/JPG/PNG/WebP.
   *   - `type` (string): one of the document_type enum values.
   *   - `issued_date` (string, YYYY-MM-DD): required for background_check
   *     and cpr_certification. Ignored for the others.
   *
   * The `FileInterceptor` holds the file in memory as a Buffer (fine at
   * 10 MB) and hands it to `@UploadedFile()`. `main.ts` already sets
   * `rawBody: true` which is compatible — multer handles multipart
   * separately from the rawBody path used by Stripe/Didit webhooks.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        // 10 MB ceiling enforced by multer BEFORE the service runs, so
        // oversize files are rejected with a 413 without buffering the
        // whole thing. The service does its own size/mime check as well
        // for defence in depth.
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({
    summary: 'Téléverser un document (PDF / JPG / PNG / WebP, max 10 Mo)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: [
            'background_check',
            'birth_certificate',
            'cpr_certification',
            'work_authorization',
            'secondary_id',
            'diploma',
          ],
        },
        issued_date: { type: 'string', format: 'date' },
      },
    },
  })
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
  ) {
    return this.documentsService.uploadDocument(user.profileId!, file, {
      type: body.type,
      issued_date: body.issued_date,
    });
  }

  /**
   * `GET /documents/me`
   *
   * Returns every document belonging to the authenticated educator, newest
   * first. Each row includes a 1-hour signed URL (`signed_url`) so the
   * frontend can render a preview without another round-trip. Re-fetch the
   * list when the URL needs to be renewed.
   */
  @Get('me')
  @ApiOperation({ summary: 'Lister mes documents' })
  async listMine(@CurrentUser() user: AuthUser) {
    return this.documentsService.listMine(user.profileId!);
  }

  /**
   * `DELETE /documents/:id`
   *
   * Only allowed when the document is still `pending_review` and belongs
   * to the authenticated educator. Approved / rejected / expired rows stay
   * in the audit trail.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Supprimer un de mes documents (uniquement si statut = pending_review)',
  })
  async deleteMine(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.documentsService.deleteMine(user.profileId!, id);
  }
}
