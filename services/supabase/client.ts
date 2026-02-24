import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Validate config
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn(
    '[Supabase] Missing credentials! Backend features are DISABLED. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
} else {
  if (import.meta.env.DEV) {
    console.info(`[Supabase] Initializing connection to project: ${supabaseUrl}`);
  }
}

/**
 * Highly persistent Supabase client for PWA usage.
 * Uses localStorage to ensure sessions survive browser restarts on iOS/Android PWA.
 */
const clientInstance: SupabaseClient<Database> | null = isConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'crypto-survivors-auth-token',
      },
    })
  : null;

/**
 * Proxy object to allow vitest to intercept calls even if client is null or const.
 * We export a mutable object that wraps the real client.
 */
export const supabase = {
  get auth() {
    return clientInstance?.auth;
  },
  get storage() {
    return clientInstance?.storage;
  },
  get functions() {
    return clientInstance?.functions;
  },
  get realtime() {
    return clientInstance?.realtime;
  },
  channel: (name: string) => clientInstance!.channel(name),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (relation: string) => clientInstance!.from(relation as any),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: unknown) => clientInstance!.rpc(fn as any, args),
} as unknown as SupabaseClient<Database>;

/**
 * Check if Supabase is properly configured and available.
 */
export function isSupabaseConfigured(): boolean {
  return clientInstance !== null;
}

export type { SupabaseClient } from '@supabase/supabase-js';
