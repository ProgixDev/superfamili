import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentsAdminController } from './documents-admin.controller';
import { DocumentsExpiryService } from './documents-expiry.service';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Educator document upload + review system.
 *
 * Pieces:
 *   - `DocumentsController`      — educator-facing REST (`/documents/*`)
 *   - `DocumentsAdminController` — admin review API   (`/admin/documents/*`)
 *   - `DocumentsService`         — upload, list, delete, admin approve/reject
 *   - `DocumentsExpiryService`   — daily cron for 30-day warnings + flip
 *
 * Depends on `NotificationsModule` to deliver in-app notifications on
 * approve / reject / expire. `SupabaseModule` is @Global so it's
 * available implicitly. `ScheduleModule.forRoot()` is already wired by
 * `TasksModule`, so the `@Cron` decorators here attach to the same
 * scheduler — no second registration needed.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [DocumentsController, DocumentsAdminController],
  providers: [DocumentsService, DocumentsExpiryService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
