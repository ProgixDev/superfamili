import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ConsentsService } from './consents.service';
import {
  AcceptConsentDto,
  CONSENT_TYPES,
  ConsentType,
} from './dto/accept-consent.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

/**
 * Consent management endpoints. All authenticated; all routes require a
 * valid JWT (enforced by the global `SupabaseAuthGuard`). No per-role
 * restriction — parents and educators both hit these endpoints.
 *
 * The policy-content endpoint is marked `@Public()` so the frontend can
 * fetch policy Markdown to display in a "read before signup" modal before
 * the user has an account. It reads only from `policy_versions`, which
 * contains no user-specific data.
 */
@ApiTags('Consents')
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  /**
   * `GET /consents/required`
   *
   * Returns the list of consents that apply to the authenticated user,
   * each annotated with whether they've already been accepted for the
   * current policy version. The frontend uses this to decide which
   * modals to show.
   */
  @Get('required')
  @ApiOperation({
    summary: "Liste des consentements applicables à l'utilisateur authentifié",
  })
  async required(@CurrentUser() user: AuthUser) {
    return this.consentsService.getRequired(user.profileId!, user.role);
  }

  /**
   * `POST /consents/accept`
   *
   * Records an acceptance (or explicit refusal, for optional consents).
   * IP and user-agent are captured server-side from the request headers —
   * clients can't spoof them through the body.
   */
  @Post('accept')
  @ApiOperation({ summary: 'Enregistrer une décision de consentement' })
  async accept(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptConsentDto,
    @Req() req: Request,
  ) {
    const context = this.extractRequestContext(req);
    await this.consentsService.accept(user.profileId!, dto, context);
    return { success: true };
  }

  /**
   * `GET /consents/history`
   *
   * Returns every consent decision the user has ever made, newest first.
   * Required by Loi 25 for data-export requests — the frontend's "Révoquer"
   * page uses this to drive the audit table.
   */
  @Get('history')
  @ApiOperation({
    summary: "Historique complet des consentements de l'utilisateur",
  })
  async history(@CurrentUser() user: AuthUser) {
    return this.consentsService.getHistory(user.profileId!);
  }

  /**
   * `DELETE /consents/:type`
   *
   * Revokes an effective consent. This controller only records the
   * revocation — it does NOT apply side effects (account deactivation,
   * KYC reset, etc.). The frontend calls this endpoint and then
   * navigates away / logs the user out for the essential consents.
   *
   * Side effects are handled per-feature downstream: the next time the
   * user hits a gated endpoint (KYC session creation, background check
   * upload, etc.), the `requireConsent()` helper throws and the user is
   * forced to re-consent or abandon the action.
   */
  @Delete(':type')
  @ApiOperation({ summary: 'Révoquer un consentement' })
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('type') type: string,
    @Req() req: Request,
  ) {
    if (!(CONSENT_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException('Type de consentement invalide.');
    }

    const context = this.extractRequestContext(req);
    await this.consentsService.revoke(
      user.profileId!,
      type as ConsentType,
      context,
    );
    return { success: true };
  }

  /**
   * `GET /consents/policy?type=terms_of_use&version=2026-04-11`
   *
   * Returns the Markdown content of a specific policy version. Used by
   * the frontend to render modals. `@Public()` because the frontend
   * needs to show these BEFORE the user has authenticated (signup flow).
   */
  @Get('policy')
  @Public()
  @ApiOperation({ summary: "Contenu Markdown d'une version de politique" })
  @ApiQuery({ name: 'type', required: true, enum: CONSENT_TYPES })
  @ApiQuery({ name: 'version', required: false })
  async policy(
    @Query('type') type: string,
    @Query('version') version?: string,
  ) {
    if (!(CONSENT_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException('Type de consentement invalide.');
    }
    return this.consentsService.getPolicyContent(type as ConsentType, version);
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  /**
   * Pulls the client IP and user-agent from the Express request.
   *
   * For IP we prefer `X-Forwarded-For` (first value — the original
   * client, ignoring downstream proxies), and fall back to `req.ip`.
   * This matches the way Railway + most reverse proxies expose the
   * real client IP. For local dev, `req.ip` is fine.
   */
  private extractRequestContext(req: Request): {
    ip: string | null;
    userAgent: string | null;
  } {
    const xff = req.headers['x-forwarded-for'];
    let ip: string | null = null;
    if (typeof xff === 'string' && xff.length > 0) {
      ip = xff.split(',')[0].trim();
    } else if (Array.isArray(xff) && xff.length > 0) {
      ip = xff[0];
    } else if (req.ip) {
      ip = req.ip;
    }

    const ua = req.headers['user-agent'];
    const userAgent = typeof ua === 'string' ? ua.slice(0, 1000) : null;

    return { ip, userAgent };
  }
}
