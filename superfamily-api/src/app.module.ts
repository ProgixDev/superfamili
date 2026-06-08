import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration from './config/configuration';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ParentsModule } from './parents/parents.module';
import { EducatorsModule } from './educators/educators.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { TasksModule } from './tasks/tasks.module';
import { KycModule } from './kyc/kyc.module';
import { DocumentsModule } from './documents/documents.module';
import { ReferencesModule } from './references/references.module';
import { ConsentsModule } from './consents/consents.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Global in-process event bus. Used by KycService → KycGateway to
    // push real-time status updates without the service holding a
    // reference to the gateway (avoids circular deps).
    EventEmitterModule.forRoot(),
    SupabaseModule,
    AuthModule,
    ProfilesModule,
    ParentsModule,
    EducatorsModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    MessagingModule,
    NotificationsModule,
    AdminModule,
    TasksModule,
    KycModule,
    DocumentsModule,
    ReferencesModule,
    ConsentsModule,
    OnboardingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
