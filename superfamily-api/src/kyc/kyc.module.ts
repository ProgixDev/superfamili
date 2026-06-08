import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { KycWebhookController } from './kyc-webhook.controller';
import { KycGateway } from './kyc.gateway';
import { DiditSignatureVerifier } from './didit-signature.verifier';

/**
 * Didit KYC integration module.
 *
 * Pieces:
 *   - `KycController`         — educator-facing REST API (JWT + role)
 *   - `KycWebhookController`  — public webhook receiver (HMAC verified)
 *   - `KycService`            — core logic: session create, webhook process
 *   - `DiditSignatureVerifier`— constant-time HMAC verifier
 *   - `KycGateway`            — Socket.IO bridge for real-time status
 *
 * Depends on `EventEmitterModule` (registered in `app.module.ts`) for
 * service-to-gateway signaling, and on `SupabaseModule` (already global)
 * for DB access.
 */
@Module({
  controllers: [KycController, KycWebhookController],
  providers: [KycService, DiditSignatureVerifier, KycGateway],
  exports: [KycService],
})
export class KycModule {}
