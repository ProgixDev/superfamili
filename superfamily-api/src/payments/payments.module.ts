import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';
import { StripeService } from './stripe.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayoutsService, StripeService],
  exports: [PaymentsService, PayoutsService, StripeService],
})
export class PaymentsModule {}
