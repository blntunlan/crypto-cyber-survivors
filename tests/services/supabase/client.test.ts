import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the supabase client creation to inspect the options passed to it
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key, options) => ({
    url,
    key,
    options,
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}));

describe('Supabase Client Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Stub environment variables to ensure client initialization logic runs
    vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-key');
  });

  it('should initialize with correct PWA persistence settings', async () => {
    // Re-import module to trigger top-level execution with stubbed env
    const { supabase: _supabase } = await import('../../../services/supabase/client');
    const { createClient } = await import('@supabase/supabase-js');

    expect(createClient).toHaveBeenCalled();
    const options = (createClient as any).mock.calls[0][2];

    expect(options.auth.persistSession).toBe(true);
    expect(options.auth.autoRefreshToken).toBe(true);
    expect(options.auth.detectSessionInUrl).toBe(true);
    expect(options.auth.storage).toBe(window.localStorage);
    expect(options.auth.storageKey).toBe('crypto-survivors-auth-token');
  });
});
