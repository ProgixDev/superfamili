import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private configService;
    private serviceRoleClient;
    private anonClient;
    constructor(configService: ConfigService);
    getServiceClient(): SupabaseClient;
    getAnonClient(): SupabaseClient;
    getUserClient(accessToken: string): SupabaseClient;
}
