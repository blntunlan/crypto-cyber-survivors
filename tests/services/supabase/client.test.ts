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
  });

  it('should initialize with correct PWA persistence settings', async () => {
    // Stub environment variables to ensure createClient is called
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

    const { supabase: _supabase } = await import('../../../services/supabase/client');
    const { createClient } = await import('@supabase/supabase-js');

    expect(createClient).toHaveBeenCalled();
    const options = (createClient as any).mock.calls[0][2];

    expect(options.auth.persistSession).toBe(true);
    expect(options.auth.autoRefreshToken).toBe(true);
    expect(options.auth.detectSessionInUrl).toBe(true);
    expect(options.auth.storage).toBe(window.localStorage);
    expect(options.auth.storageKey).toBe('crypto-survivors-auth-token');

    vi.unstubAllEnvs();
  });
});
