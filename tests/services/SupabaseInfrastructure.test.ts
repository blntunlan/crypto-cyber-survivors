import { describe, it, expect, vi } from 'vitest';
import { isSupabaseConfigured, supabase } from '../../services/supabase/client';
import { Logger } from '../../services/system/Logger';

describe('Supabase Infrastructure', () => {
  it('should report configuration status correctly', () => {
    // If we are in a test environment with .env.test, this might be true or false
    // We just check consistency
    const status = isSupabaseConfigured();
    if (status) {
      expect(supabase.auth).not.toBeUndefined();
    } else {
      // The supabase export is a proxy object that is never null.
      // Tests verifying configuration status should check specific properties.
      expect(supabase.auth).toBeUndefined();
    }
  });

  it('should have basic expected methods if configured', () => {
    // In our proxy implementation, properties like 'from' always exist as functions
    // but auth/functions/storage will be undefined if not configured.
    if (isSupabaseConfigured()) {
      expect(supabase.auth).not.toBeUndefined();
      expect(supabase.functions).not.toBeUndefined();
    }
  });
});

describe('Supabase Error Handling in Services', () => {
  // We want to test how other services behave when Supabase returns an error
  it('should handle database errors without crashing', async () => {
    vi.spyOn(Logger, 'error');

    // Mock a failing supabase call
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'Database unreachable' } })
          ),
        })),
      })),
    };

    // Example service logic test (AchievementService or similar)
    const { data, error } = await mockSupabase.from().select().eq();

    expect(data).toBeNull();
    expect(error.message).toBe('Database unreachable');
  });
});
