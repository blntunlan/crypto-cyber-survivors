import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '../types/supabase';

import { Logger } from './Logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Validate config and create client only if credentials are present
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  Logger.warn('[Supabase] Missing credentials. Backend features will be disabled.');
} else {
  if (import.meta.env.DEV) {
    Logger.info(`[Supabase] Connected to project: ${supabaseUrl}`);
  }
}

/**
 * Supabase client instance.
 * Will be null if credentials are not configured.
 * Always check with `isSupabaseConfigured()` before using.
 */
export const supabase: SupabaseClient<Database> | null = isConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : null;

/**
 * Check if Supabase is properly configured and available.
 * Use this before any supabase operations.
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export type { SupabaseClient } from '@supabase/supabase-js';
