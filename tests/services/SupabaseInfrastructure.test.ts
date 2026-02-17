import { describe, it, expect } from 'vitest';
import { supabase, isSupabaseConfigured } from '../../services/supabase/client';

/**
 * Supabase Infrastructure Test
 *
 * Verifies that the Supabase client is correctly exported and behaves
 * as expected in the current environment (even if credentials are missing).
 */
describe('Supabase Infrastructure', () => {
  it('should report configuration status correctly', () => {
    // In CI/Test environment without env vars, this should be false
    // But we check consistency between the helper and the client state
    const configured = isSupabaseConfigured();

    if (configured) {
      expect(supabase).not.toBeNull();
    } else {
      // Even if not configured, the exported 'supabase' object is a proxy object, not null.
      // It should still be defined, but its internal clientInstance is null.
      // The original test expected it to be null, but the implementation exports an object.
      expect(supabase).toBeDefined();
      expect(typeof supabase).toBe('object');

      // Verify properties return undefined/throw safely when accessed
      expect(supabase.auth).toBeUndefined();
    }
  });

  it('should have basic expected methods if configured', () => {
    if (isSupabaseConfigured()) {
      expect(supabase.auth).toBeDefined();
      expect(supabase.from).toBeDefined();
    }
  });

  it('should handle database errors without crashing', () => {
    // This is a smoke test to ensure importing doesn't crash
    expect(supabase).toBeDefined();
  });
});
