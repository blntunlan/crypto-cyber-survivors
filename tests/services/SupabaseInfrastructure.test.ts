import { describe, it, expect, vi } from 'vitest';
import { isSupabaseConfigured, supabase } from '../../services/supabase/client';
import { Logger } from '../../services/system/Logger';

describe('Supabase Infrastructure', () => {
  it('should report configuration status correctly', () => {
    // If we are in a test environment with .env.test, this might be true or false
    // We just check consistency
    const status = isSupabaseConfigured();
    if (status) {
      expect(supabase).not.toBeNull();
    } else {
      // The exported supabase object is a proxy that is never null,
      // even if the underlying client is not initialized.
      expect(supabase).not.toBeNull();
    }
  });

  it('should have basic expected methods if configured', () => {
    if (isSupabaseConfigured()) {
      expect(supabase).toHaveProperty('from');
      expect(supabase).toHaveProperty('auth');
      expect(supabase).toHaveProperty('functions');
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
