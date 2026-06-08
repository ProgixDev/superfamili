import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

export type OtpPurpose =
  | 'signup_verification'
  | 'password_reset'
  | 'email_change';

interface IssueOtpParams {
  email: string;
  purpose: OtpPurpose;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

interface VerifyOtpParams {
  email: string;
  purpose: OtpPurpose;
  code: string;
}

export interface VerifiedOtp {
  id: string;
  userId: string | null;
  email: string;
  metadata: Record<string, unknown>;
}

/**
 * OTP lifecycle: issue → email → verify → consume. All flows share one
 * table (`email_otps`). Codes are stored SHA-256 hashed; plaintext lives
 * only in the email we send.
 *
 * - Validity: 10 min.
 * - Max attempts per code: 5 (prevents brute force of a stolen DB row).
 * - Resend cooldown: caller's responsibility (see auth.service).
 * - Issuing a new OTP supersedes older unconsumed codes for the same
 *   (email, purpose) pair so a re-send can't leave two live codes.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private static readonly EXPIRY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 5;

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Generates a 6-digit OTP, hashes it, and stores the row. Returns the plaintext for emailing. */
  async issue(
    params: IssueOtpParams,
  ): Promise<{ code: string; expiresInMinutes: number }> {
    const supabase = this.supabaseService.getServiceClient();
    const code = this.generateCode();
    const codeHash = this.hash(code);
    const expiresAt = new Date(
      Date.now() + OtpService.EXPIRY_MINUTES * 60 * 1000,
    );

    // Invalidate prior unconsumed codes for the same (email, purpose).
    // We mark them consumed rather than deleting so the history is preserved
    // for auditing (useful when debugging user support reports).
    await supabase
      .from('email_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('email', params.email.toLowerCase())
      .eq('purpose', params.purpose)
      .is('consumed_at', null);

    const { error } = await supabase.from('email_otps').insert({
      email: params.email.toLowerCase(),
      purpose: params.purpose,
      user_id: params.userId ?? null,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
      metadata: params.metadata ?? {},
    });

    if (error) {
      this.logger.error(
        `Failed to insert OTP row (purpose=${params.purpose}): ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Impossible d'émettre le code pour le moment",
      );
    }

    return { code, expiresInMinutes: OtpService.EXPIRY_MINUTES };
  }

  /**
   * Verifies a code. On success the row is marked consumed and returned.
   * Throws BadRequestException on every failure mode (wrong code, expired,
   * too many attempts, unknown). Error messages are deliberately vague —
   * we don't want to confirm whether an address exists for password_reset.
   */
  async verify(params: VerifyOtpParams): Promise<VerifiedOtp> {
    const supabase = this.supabaseService.getServiceClient();

    const { data: row, error } = await supabase
      .from('email_otps')
      .select(
        'id, user_id, email, code_hash, expires_at, attempts, consumed_at, metadata',
      )
      .eq('email', params.email.toLowerCase())
      .eq('purpose', params.purpose)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(`OTP lookup failed: ${error.message}`);
      throw new InternalServerErrorException(
        'Impossible de vérifier le code pour le moment',
      );
    }

    if (!row) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const now = new Date();
    if (new Date(row.expires_at) < now) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    if (row.attempts >= OtpService.MAX_ATTEMPTS) {
      // Consume the row so a brute-forcer can't keep hammering it forever.
      await supabase
        .from('email_otps')
        .update({ consumed_at: now.toISOString() })
        .eq('id', row.id);
      throw new BadRequestException(
        'Trop de tentatives. Demandez un nouveau code.',
      );
    }

    if (!this.constantTimeEqual(this.hash(params.code), row.code_hash)) {
      await supabase
        .from('email_otps')
        .update({ attempts: row.attempts + 1 })
        .eq('id', row.id);
      throw new BadRequestException('Code invalide ou expiré');
    }

    // Success — mark consumed so the same code can't be reused.
    const { error: consumeErr } = await supabase
      .from('email_otps')
      .update({ consumed_at: now.toISOString() })
      .eq('id', row.id);

    if (consumeErr) {
      this.logger.error(`Failed to mark OTP consumed: ${consumeErr.message}`);
      throw new InternalServerErrorException(
        'Impossible de valider le code pour le moment',
      );
    }

    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      metadata: (row.metadata || {}) as Record<string, unknown>,
    };
  }

  private generateCode(): string {
    // 6 digits, leading zeros allowed. crypto.randomInt is unbiased; String(...).padStart handles <100000.
    const n = crypto.randomInt(0, 1_000_000);
    return n.toString().padStart(6, '0');
  }

  private hash(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
