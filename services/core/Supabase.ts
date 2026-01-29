import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '../../types/supabase';

import { Logger } from '../system/Logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Validate config and create client only if credentials are present
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  Logger.warn(
    '[Supabase] Missing credentials! Backend features are DISABLED. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
} else {
  if (import.meta.env.DEV) {
    Logger.info(`[Supabase] Initializing connection to project: ${supabaseUrl}`);
  }
}

/**
 * Supabase client instance.
 * Will be null if credentials are not configured.
 * Always check with `isSupabaseConfigured()` before using.
 */
export const supabase: SupabaseClient<Database> | null = isConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Check if Supabase is properly configured and available.
 * Use this before any supabase operations.
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export type { SupabaseClient } from '@supabase/supabase-js';
