import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { OtpService } from './otp.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Existing: create the profile after the backend has verified the email.
  // ───────────────────────────────────────────────────────────────────────────
  async signup(userId: string, email: string, dto: SignupDto) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new ConflictException('Un profil existe déjà pour cet utilisateur');
    }

    let locationData: {
      latitude?: number;
      longitude?: number;
      location_point?: string;
    } = {};
    let resolvedCity = dto.city || undefined;

    if (dto.postal_code) {
      const { data: postalData } = await supabase
        .from('postal_codes')
        .select('latitude, longitude, city')
        .eq('postal_code', dto.postal_code)
        .single();

      if (postalData) {
        locationData = {
          latitude: postalData.latitude,
          longitude: postalData.longitude,
          location_point: `POINT(${postalData.longitude} ${postalData.latitude})`,
        };
        if (!resolvedCity) resolvedCity = postalData.city;
      }
    } else if (dto.city) {
      const { data: cityData } = await supabase
        .from('cities')
        .select('latitude, longitude, name')
        .ilike('name', dto.city)
        .limit(1)
        .single();

      if (cityData) {
        locationData = {
          latitude: cityData.latitude,
          longitude: cityData.longitude,
          location_point: `POINT(${cityData.longitude} ${cityData.latitude})`,
        };
        resolvedCity = cityData.name;
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        role: dto.role,
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: email,
        phone: dto.phone,
        postal_code: dto.postal_code,
        city: resolvedCity,
        ...locationData,
      })
      .select()
      .single();

    if (profileError) {
      throw new InternalServerErrorException(
        'Erreur lors de la création du profil',
      );
    }

    if (dto.role === 'parent') {
      await supabase.from('parent_profiles').insert({ profile_id: profile.id });
    } else if (dto.role === 'educator') {
      await supabase
        .from('educator_profiles')
        .insert({ profile_id: profile.id });
    }

    return {
      id: profile.id,
      user_id: userId,
      email: email,
      role: dto.role,
      first_name: dto.first_name,
      last_name: dto.last_name,
    };
  }

  async getMe(userId: string) {
    const supabase = this.supabaseService.getServiceClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      throw new BadRequestException('Profil non trouvé');
    }

    let roleProfile = null;
    if (profile.role === 'parent') {
      const { data } = await supabase
        .from('parent_profiles')
        .select('*, children(*)')
        .eq('profile_id', profile.id)
        .single();
      roleProfile = data;
    } else if (profile.role === 'educator') {
      const { data } = await supabase
        .from('educator_profiles')
        .select('*, educator_services(*, services(*))')
        .eq('profile_id', profile.id)
        .single();
      roleProfile = data;
    }

    return {
      ...profile,
      role_profile: roleProfile,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Backend-owned signup init (bypasses Supabase's default confirmation email)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create the Supabase auth user with `email_confirm: false`. Crucially,
   * admin.createUser does NOT trigger Supabase's own "confirm your email"
   * message — we own verification end-to-end with our SMTP OTP instead.
   *
   * If an unconfirmed user already exists for the same address (e.g. the
   * previous attempt failed between createUser and OTP email), we re-issue
   * an OTP against the existing row instead of erroring.
   */
  async signupInit(params: {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
  }) {
    const lowered = params.email.toLowerCase();
    const supabase = this.supabaseService.getServiceClient();

    const existing = await this.findAuthUserByEmail(lowered);

    if (existing?.email_confirmed_at) {
      throw new ConflictException(
        'Cette adresse courriel est déjà utilisée. Connectez-vous plutôt.',
      );
    }

    if (existing && !existing.email_confirmed_at) {
      // Reset the password on the stale unconfirmed row so the user can
      // finish signing up with whatever password they just typed.
      const { error: passError } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          password: params.password,
          user_metadata: {
            first_name: params.first_name,
            last_name: params.last_name ?? '',
          },
        },
      );
      if (passError) {
        this.logger.error(
          `signupInit: update existing unconfirmed user failed: ${passError.message}`,
        );
        throw new InternalServerErrorException(
          "Impossible d'enregistrer le compte pour le moment",
        );
      }
    } else {
      const { error: createError } = await supabase.auth.admin.createUser({
        email: lowered,
        password: params.password,
        email_confirm: false,
        user_metadata: {
          first_name: params.first_name,
          last_name: params.last_name ?? '',
        },
      });
      if (createError) {
        const msg = createError.message || '';
        if (/already/i.test(msg)) {
          throw new ConflictException(
            'Cette adresse courriel est déjà utilisée.',
          );
        }
        this.logger.error(`signupInit: createUser failed: ${msg}`);
        throw new InternalServerErrorException(
          'Impossible de créer le compte pour le moment',
        );
      }
    }

    await this.sendSignupVerification(lowered, params.first_name);
    return { sent: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Signup email verification (backend-managed OTP)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Issue a signup-verification OTP. Called by the frontend right after
   * `supabase.auth.signUp` succeeds — the Supabase user exists but hasn't
   * confirmed their email yet. We also pass it when the user hits "resend".
   *
   * Returns `{ sent: true }` whether or not the address is already confirmed
   * (enumeration defence). In the "already confirmed" case we skip sending.
   */
  async sendSignupVerification(email: string, firstName?: string) {
    const lowered = email.toLowerCase();
    const supabase = this.supabaseService.getServiceClient();

    const authUser = await this.findAuthUserByEmail(lowered);
    if (authUser?.email_confirmed_at) {
      // Don't tell the client — just pretend we sent one.
      return { sent: true };
    }

    const { code, expiresInMinutes } = await this.otpService.issue({
      email: lowered,
      purpose: 'signup_verification',
      userId: authUser?.id ?? null,
    });

    try {
      await this.emailService.sendSignupVerification(lowered, {
        firstName,
        code,
        expiresInMinutes,
      });
    } catch (err) {
      this.logger.error(
        `sendSignupVerification: email failed for ${lowered}: ${(err as Error).message}`,
      );
      throw new InternalServerErrorException(
        "Impossible d'envoyer le courriel de vérification",
      );
    }

    // Keep a reference to supabase so we don't drop the unused import later —
    // other flows may want to write to auth.users.user_metadata here.
    void supabase;

    return { sent: true };
  }

  /**
   * Verify the signup OTP and flip `email_confirmed_at` on the Supabase user.
   * Returns an access_token + refresh_token so the frontend can call
   * /auth/signup straight after, exactly like before.
   */
  async verifyEmail(email: string, code: string) {
    const lowered = email.toLowerCase();

    const verified = await this.otpService.verify({
      email: lowered,
      code,
      purpose: 'signup_verification',
    });

    const userId = verified.userId;
    if (!userId) {
      throw new BadRequestException('Compte introuvable');
    }

    const supabase = this.supabaseService.getServiceClient();
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { email_confirm: true },
    );

    if (updateError) {
      this.logger.error(
        `verifyEmail: failed to confirm user ${userId}: ${updateError.message}`,
      );
      throw new InternalServerErrorException(
        "Impossible de confirmer l'adresse courriel",
      );
    }

    // Issue a session so the client can call /auth/signup without re-login.
    // generateLink('magiclink') is the server-side way to mint a session for
    // an existing user without knowing their password.
    const session = await this.mintSession(lowered);
    return session;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Password reset (forgot password)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Issue a password-reset OTP. Always returns `{ sent: true }` — we don't
   * confirm whether the address is registered, to avoid account enumeration.
   */
  async forgotPassword(email: string) {
    const lowered = email.toLowerCase();
    const authUser = await this.findAuthUserByEmail(lowered);

    if (!authUser) {
      // Pretend we sent one. Log so legitimate-user-with-typo cases are visible.
      this.logger.log(`forgotPassword: no user for ${lowered} (silent)`);
      return { sent: true };
    }

    const profile = await this.findProfileByUserId(authUser.id);
    const { code, expiresInMinutes } = await this.otpService.issue({
      email: lowered,
      purpose: 'password_reset',
      userId: authUser.id,
    });

    try {
      await this.emailService.sendPasswordReset(lowered, {
        firstName: profile?.first_name,
        code,
        expiresInMinutes,
      });
    } catch (err) {
      this.logger.error(
        `forgotPassword: email failed for ${lowered}: ${(err as Error).message}`,
      );
      // Swallow — still return sent:true to stay consistent.
    }

    return { sent: true };
  }

  /** Verify the reset OTP and rotate the password on the Supabase user. */
  async resetPassword(email: string, code: string, newPassword: string) {
    const lowered = email.toLowerCase();
    const verified = await this.otpService.verify({
      email: lowered,
      code,
      purpose: 'password_reset',
    });

    if (!verified.userId) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const supabase = this.supabaseService.getServiceClient();
    const { error } = await supabase.auth.admin.updateUserById(
      verified.userId,
      {
        password: newPassword,
      },
    );

    if (error) {
      this.logger.error(
        `resetPassword: failed to update user ${verified.userId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Impossible de mettre à jour le mot de passe',
      );
    }

    return { success: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Email change (authenticated flow)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Send a confirmation code to the **new** address. The old address gets a
   * heads-up email only after the change completes, so we don't spam it on
   * every request attempt.
   */
  async requestEmailChange(
    userId: string,
    currentEmail: string,
    newEmail: string,
  ) {
    const newLower = newEmail.toLowerCase();
    if (newLower === currentEmail.toLowerCase()) {
      throw new BadRequestException(
        "La nouvelle adresse doit être différente de l'adresse actuelle",
      );
    }

    // Check the new address isn't already taken by another account.
    const existing = await this.findAuthUserByEmail(newLower);
    if (existing && existing.id !== userId) {
      throw new ConflictException('Cette adresse courriel est déjà utilisée');
    }

    const profile = await this.findProfileByUserId(userId);
    const { code, expiresInMinutes } = await this.otpService.issue({
      email: newLower,
      purpose: 'email_change',
      userId,
      metadata: { previous_email: currentEmail.toLowerCase() },
    });

    try {
      await this.emailService.sendEmailChangeConfirmation(newLower, {
        firstName: profile?.first_name,
        code,
        expiresInMinutes,
        newEmail: newLower,
      });
    } catch (err) {
      this.logger.error(
        `requestEmailChange: email failed for ${newLower}: ${(err as Error).message}`,
      );
      throw new InternalServerErrorException(
        "Impossible d'envoyer le courriel de confirmation",
      );
    }

    return { sent: true };
  }

  /**
   * Verify the email-change OTP, rotate the address on both `auth.users` and
   * `public.profiles`, and notify the previous address.
   */
  async confirmEmailChange(userId: string, newEmail: string, code: string) {
    const newLower = newEmail.toLowerCase();

    const verified = await this.otpService.verify({
      email: newLower,
      code,
      purpose: 'email_change',
    });

    // Bind check — the OTP's owning user must match the caller.
    if (verified.userId && verified.userId !== userId) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const supabase = this.supabaseService.getServiceClient();

    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { email: newLower, email_confirm: true },
    );

    if (authError) {
      this.logger.error(
        `confirmEmailChange: auth update failed for ${userId}: ${authError.message}`,
      );
      throw new InternalServerErrorException(
        "Impossible de mettre à jour l'adresse courriel",
      );
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: newLower })
      .eq('user_id', userId);

    if (profileError) {
      this.logger.error(
        `confirmEmailChange: profile update failed for ${userId}: ${profileError.message}`,
      );
      // auth.users is the source of truth for login; profiles.email is informational.
      // Don't fail the whole request — just log.
    }

    const previousEmail =
      (verified.metadata?.previous_email as string | undefined) || null;
    if (previousEmail) {
      const profile = await this.findProfileByUserId(userId);
      try {
        await this.emailService.sendEmailChangeNotice(previousEmail, {
          firstName: profile?.first_name,
          newEmail: newLower,
        });
      } catch (err) {
        // Non-fatal. Log and move on.
        this.logger.warn(
          `confirmEmailChange: notice email to ${previousEmail} failed: ${(err as Error).message}`,
        );
      }
    }

    return { success: true, email: newLower };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────────

  private async findAuthUserByEmail(email: string) {
    // PostgREST doesn't expose the `auth` schema by default, so we can't
    // query auth.users directly. We use a SECURITY DEFINER RPC function
    // instead — it's scoped to the service role and returns just what we need.
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase.rpc('find_auth_user_by_email', {
      p_email: email,
    });

    if (error) {
      this.logger.error(`findAuthUserByEmail: RPC failed: ${error.message}`);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return row as {
      id: string;
      email: string;
      email_confirmed_at: string | null;
    };
  }

  private async findProfileByUserId(userId: string) {
    const supabase = this.supabaseService.getServiceClient();
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', userId)
      .maybeSingle();
    return data as {
      first_name: string;
      last_name: string;
      email: string;
    } | null;
  }

  /**
   * Mint a session for an already-confirmed user without knowing their
   * password. We use `generateLink('magiclink')` with `type=recovery` which
   * returns a hashed_token/action_link — but what the frontend actually needs
   * is an access/refresh token pair. The cleanest server-side path is
   * `admin.generateLink` + `auth.verifyOtp({ type: 'magiclink' })` against
   * the anon client using the token.
   */
  private async mintSession(email: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (error || !data?.properties?.hashed_token) {
      this.logger.error(
        `mintSession: generateLink failed: ${error?.message ?? 'no token'}`,
      );
      throw new InternalServerErrorException(
        'Impossible de créer une session pour cet utilisateur',
      );
    }

    // Exchange the hashed_token for a session via the anon client.
    const anon = this.supabaseService.getAnonClient();
    const { data: sessionData, error: otpError } = await anon.auth.verifyOtp({
      type: 'magiclink',
      token_hash: data.properties.hashed_token,
    });

    if (otpError || !sessionData.session) {
      this.logger.error(
        `mintSession: verifyOtp failed: ${otpError?.message ?? 'no session'}`,
      );
      throw new InternalServerErrorException(
        'Impossible de créer une session pour cet utilisateur',
      );
    }

    return {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    };
  }
}
