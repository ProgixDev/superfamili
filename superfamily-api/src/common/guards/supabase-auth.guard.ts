import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_NO_PROFILE_KEY } from '../decorators/allow-no-profile.decorator';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const allowNoProfile = this.reflector.getAllAndOverride<boolean>(
      ALLOW_NO_PROFILE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException("Jeton d'authentification manquant");
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Verify token with Supabase Auth
      const supabase = this.supabaseService.getAnonClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Jeton invalide ou expiré');
      }

      // Load profile from DB. This uses `.maybeSingle()` so we can distinguish
      // "no row found" (null) from "DB error" (throws).
      const serviceClient = this.supabaseService.getServiceClient();
      const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        // A real DB error (connection, RLS, bad query). Log and 401 — the
        // alternative is a cryptic downstream "Profil parent non trouvé".
        this.logger.error(
          `Profile lookup failed for user ${user.id}: ${profileError.message}`,
        );
        throw new UnauthorizedException(
          'Impossible de vérifier votre profil. Veuillez réessayer.',
        );
      }

      if (!profile && !allowNoProfile) {
        // Authenticated, but no profile row exists. Every endpoint except
        // POST /auth/signup (marked with @AllowNoProfile) requires a profile.
        // Fail loudly so the frontend can guide the user to finish signup,
        // instead of falling through to a downstream 403 with a misleading
        // "Profil parent non trouvé" message.
        throw new UnauthorizedException(
          'Aucun profil associé à ce compte. Veuillez compléter votre inscription.',
        );
      }

      // Attach user to request. `role` and `profileId` are undefined only for
      // @AllowNoProfile endpoints, which must not depend on them.
      const authUser: AuthUser = {
        userId: user.id,
        email: user.email!,
        role: profile?.role as AuthUser['role'],
        profileId: profile?.id,
      };

      request.user = authUser;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Jeton invalide ou expiré');
    }
  }
}
