import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { KycService } from './kyc.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Public endpoint that receives Didit webhook events.
 *
 * This controller deliberately lives separately from `KycController` so we
 * can mark just this one route `@Public()` — the educator-facing API
 * remains behind the JWT guard.
 *
 * Body handling: we use `@Req()` with `RawBodyRequest<Request>` so we can
 * read `req.rawBody` — the un-parsed bytes Didit actually signed. The
 * existing global ValidationPipe doesn't interfere because the controller
 * doesn't declare a `@Body()` parameter; Nest still parses `req.body` for
 * us from the JSON payload, but we ignore that and recompute the HMAC
 * over the raw bytes.
 *
 * Error handling follows the Didit retry semantics
 * (https://docs.didit.me/integration/webhooks):
 *
 *   - **401 Unauthorized** on bad signature → Didit retries up to 2x then
 *     stops. We want this behavior on tampered/stale requests so genuine
 *     misconfigurations surface quickly in the Didit dashboard.
 *   - **200 OK** on any internal processing error after the signature
 *     check → we swallow transient DB errors so Didit doesn't hammer us
 *     with retries. Everything is logged and the raw payload is safely
 *     persisted *before* business logic runs (if we get that far).
 *   - **200 OK** on successful processing.
 *
 * Idempotency is handled inside `KycService.handleWebhook` — a replay of
 * the same `(session_id, status)` is a no-op.
 */
@Controller('kyc')
export class KycWebhookController {
  private readonly logger = new Logger(KycWebhookController.name);

  constructor(private readonly kycService: KycService) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // keep out of Swagger — internal-only callback
  async handleDiditWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true }> {
    // rawBody is populated because `main.ts` creates the app with
    // `rawBody: true` (shared with the Stripe webhook).
    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      this.logger.warn('Didit webhook received with empty body');
      // Empty bodies can't possibly be signed correctly; treat as bad auth.
      throw new UnauthorizedException('Empty webhook body.');
    }

    try {
      await this.kycService.handleWebhook(rawBody, headers);
    } catch (err) {
      // Let UnauthorizedException propagate (bad signature → 401).
      if (err instanceof UnauthorizedException) throw err;

      // Everything else: log and swallow. Returning 200 prevents Didit
      // from retrying on transient DB errors. The raw payload is already
      // logged at info level inside handleWebhook.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Didit webhook processing error (swallowed, returning 200): ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
    }

    return { received: true };
  }
}
