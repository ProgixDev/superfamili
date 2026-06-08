import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminEducatorsController } from './admin-educators.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminVerificationsService } from './admin-verifications.service';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminDisputesService } from './admin-disputes.service';
import { AdminEducatorsService } from './admin-educators.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminController, AdminEducatorsController],
  providers: [
    AdminUsersService,
    AdminVerificationsService,
    AdminTransactionsService,
    AdminDisputesService,
    AdminEducatorsService,
  ],
})
export class AdminModule {}
