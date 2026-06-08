import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingsRedirectService } from './bookings-redirect.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { EducatorsModule } from '../educators/educators.module';

@Module({
  imports: [NotificationsModule, PaymentsModule, EducatorsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRedirectService],
  exports: [BookingsService, BookingsRedirectService],
})
export class BookingsModule {}
