import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser } from '../../common/interfaces/auth-user.interface';

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('supabase.jwtSecret')!,
    });
  }

  async validate(payload: any): Promise<AuthUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Jeton invalide');
    }

    const supabase = this.supabaseService.getServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', payload.sub)
      .single();

    if (error || !profile) {
      throw new UnauthorizedException('Profil non trouvé');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: profile.role,
      profileId: profile.id,
    };
  }
}
