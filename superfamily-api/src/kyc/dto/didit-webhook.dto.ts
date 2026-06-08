/**
 * Loose DTO for an incoming Didit webhook body. We do NOT run it through
 * class-validator — Didit adds fields over time and we don't want valid
 * events to be rejected by whitelist validation. Instead we:
 *
 *  1. Verify the HMAC signature over the raw body (signature.verifier.ts).
 *  2. Persist the raw payload to `kyc_verifications.raw_webhook_payload`.
 *  3. Extract only the fields we care about into typed columns.
 *
 * If you want schema validation on incoming webhooks, add it here and wire
 * it in the webhook controller — but the global ValidationPipe is
 * deliberately bypassed on the webhook route to preserve forward-compat.
 */
export { DiditWebhookEnvelope as DiditWebhookDto } from '../interfaces/didit-webhook-payload.interface';
