import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
declare const SupabaseJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class SupabaseJwtStrategy extends SupabaseJwtStrategy_base {
    private readonly supabaseService;
    constructor(configService: ConfigService, supabaseService: SupabaseService);
    validate(payload: any): Promise<AuthUser>;
}
export {};
