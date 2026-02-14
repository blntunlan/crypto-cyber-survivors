import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Logger to prevent actual logging and circular dependency issues
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Supabase Client Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should initialize with correct PWA persistence settings', async () => {
    // 1. Stub environment variables BEFORE importing the client
    vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-key');

    // 2. Import modules dynamically to pick up the stubbed env
    const { createClient } = await import('@supabase/supabase-js');
    await import('../../../services/supabase/client');

    // 3. Verify createClient was called
    expect(createClient).toHaveBeenCalled();

    // 4. Verify options
    const options = (createClient as any).mock.calls[0][2];
    expect(options.auth.persistSession).toBe(true);
    expect(options.auth.autoRefreshToken).toBe(true);
    expect(options.auth.detectSessionInUrl).toBe(true);
    // window.localStorage is available in jsdom environment
    expect(options.auth.storage).toBe(window.localStorage);
    expect(options.auth.storageKey).toBe('crypto-survivors-auth-token');
  });
});
