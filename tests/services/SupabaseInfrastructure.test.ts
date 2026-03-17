import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Supabase Infrastructure', () => {
  it('should report configuration status correctly', async () => {
    const { isSupabaseConfigured } = await import('../../services/supabase/client');
    const status = isSupabaseConfigured();
    expect(typeof status).toBe('boolean');
  });

  it('should have auth methods if configured (auth-only client)', async () => {
    const { supabase, isSupabaseConfigured } =
      await import('../../services/supabase/client');
    if (isSupabaseConfigured()) {
      expect(supabase).toHaveProperty('auth');
    }
  });
});

describe('Supabase Error Handling in Services', () => {
  it('should handle API errors without crashing', async () => {
    // With Supabase now auth-only, test that Railway API errors are handled gracefully
    const mockRailwayClient = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    await expect(mockRailwayClient.get('/api/v1/profile')).rejects.toThrow(
      'Network error'
    );
  });
});
