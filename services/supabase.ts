import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Validate config
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing credentials. Backend features will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type { SupabaseClient } from '@supabase/supabase-js';
