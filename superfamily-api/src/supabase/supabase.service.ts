import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private serviceRoleClient: SupabaseClient;
  private anonClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url')!;
    const serviceRoleKey = this.configService.get<string>(
      'supabase.serviceRoleKey',
    )!;
    const anonKey = this.configService.get<string>('supabase.anonKey')!;

    this.serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  getServiceClient(): SupabaseClient {
    return this.serviceRoleClient;
  }

  getAnonClient(): SupabaseClient {
    return this.anonClient;
  }

  getUserClient(accessToken: string): SupabaseClient {
    const supabaseUrl = this.configService.get<string>('supabase.url')!;
    const anonKey = this.configService.get<string>('supabase.anonKey')!;

    return createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}
