import { SupabaseClient } from '@supabase/supabase-js';
export declare function getDistanceBetweenPostalCodes(supabase: SupabaseClient, postalCode1: string, postalCode2: string): Promise<number>;
export declare function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
