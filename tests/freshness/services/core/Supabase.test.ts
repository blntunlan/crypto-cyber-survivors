import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/core/Supabase.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/core/Supabase.ts', import.meta.url);
  });
});
