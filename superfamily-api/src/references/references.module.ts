import { Module } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { ReferencesAdminController } from './references-admin.controller';

/**
 * Educator references module.
 *
 *   - `ReferencesController`      — /educators/me/references/*       (educator)
 *   - `ReferencesAdminController` — /admin/educators/:id/references/* (admin)
 *   - `ReferencesService`         — shared logic + canActivate helper
 *
 * Exports the service so other modules (e.g., a future activation gate)
 * can check `canActivate(profileId)` without a DB round-trip of their
 * own.
 */
@Module({
  controllers: [ReferencesController, ReferencesAdminController],
  providers: [ReferencesService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
