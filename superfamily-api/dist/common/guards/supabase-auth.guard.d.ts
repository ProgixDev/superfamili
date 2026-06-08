import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
export declare class SupabaseAuthGuard implements CanActivate {
    private reflector;
    private supabaseService;
    private readonly logger;
    constructor(reflector: Reflector, supabaseService: SupabaseService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
