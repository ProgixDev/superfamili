import { Global, Module } from '@nestjs/common';
import { ConsentsService } from './consents.service';
import { ConsentsController } from './consents.controller';

/**
 * Consent + policy versioning module.
 *
 * Marked `@Global()` so any other module can inject `ConsentsService`
 * without listing it in its own `imports` — KYC, documents, and
 * references all need the `requireConsent()` gate and it would be
 * noisy to keep re-importing this module.
 */
@Global()
@Module({
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
