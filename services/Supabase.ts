import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { Logger } from './Logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Validate config and create client only if credentials are present
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  Logger.warn('[Supabase] Missing credentials. Backend features will be disabled.');
}

/**
 * Supabase client instance.
 * Will be null if credentials are not configured.
 * Always check with `isSupabaseConfigured()` before using.
 */
// Generate types with: npm run supabase:gen
// Then import { Database } from '../types/supabase';
// For now, using 'any' to avoid build break until first generation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any> | null = isConfigured
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createClient<any>(supabaseUrl!, supabaseAnonKey!)
  : null;

/**
 * Check if Supabase is properly configured and available.
 * Use this before any supabase operations.
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export type { SupabaseClient } from '@supabase/supabase-js';
