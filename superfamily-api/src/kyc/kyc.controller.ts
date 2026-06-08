import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

/**
 * Authenticated KYC endpoints. All routes require a valid Supabase JWT
 * (enforced globally by `SupabaseAuthGuard`) plus the `educator` role
 * (enforced by `RolesGuard` via `@Roles('educator')`).
 *
 * The public webhook endpoint lives in a separate controller
 * (`kyc-webhook.controller.ts`) so that route can be marked `@Public()`
 * without relaxing auth on anything else here.
 */
@ApiTags('KYC')
@Controller('kyc')
@Roles('educator')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  /**
   * Start a new Didit verification session for the authenticated user.
   * Returns the Unilink URL the user opens on their phone (or desktop).
   *
   * Safe to call repeatedly — each call creates a fresh session. Old
   * sessions stay in the audit trail but are superseded.
   */
  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a new Didit KYC session for the authenticated user',
  })
  async startSession(
    @CurrentUser() user: AuthUser,
    // Body is accepted for future-proofing (language override, etc.);
    // empty body is valid. We don't read it yet — callers can omit.
    @Body() _dto: CreateSessionDto,
  ) {
    const { sessionId, verificationUrl, expiresAt } =
      await this.kycService.createSession(user.profileId!);
    return {
      session_id: sessionId,
      verification_url: verificationUrl,
      expires_at: expiresAt?.toISOString() ?? null,
    };
  }

  /**
   * Lightweight polling endpoint used by the desktop UI while the user is
   * completing the flow on their phone. Returns the current status of the
   * user's most recent session, or `not_started` if none exists.
   *
   * Frontend should prefer the WebSocket channel (`kyc:status-updated`)
   * once connected, and fall back to polling this every few seconds if
   * sockets are unavailable.
   */
  @Get('status')
  @ApiOperation({
    summary: 'Poll the current KYC status for the authenticated user',
  })
  async getStatus(@CurrentUser() user: AuthUser) {
    return this.kycService.pollStatus(user.profileId!);
  }

  /**
   * Full most-recent KYC record for the authenticated user, including
   * extracted document fields. Used on the profile page to show the
   * verified name / DOB / document number.
   */
  @Get('latest')
  @ApiOperation({
    summary:
      'Fetch the full most-recent KYC verification record for the authenticated user',
  })
  async getLatest(@CurrentUser() user: AuthUser) {
    const row = await this.kycService.getSessionStatus(user.profileId!);
    if (!row) {
      throw new NotFoundException(
        'Aucune session de vérification trouvée pour ce compte.',
      );
    }
    return row;
  }
}
