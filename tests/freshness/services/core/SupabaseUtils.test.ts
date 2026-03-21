import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/core/SupabaseUtils.ts', () => {
  // Freshness checkpoint updated: 2026-03-19 (Supabase utility changes).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/core/SupabaseUtils.ts', import.meta.url);
  });
});
