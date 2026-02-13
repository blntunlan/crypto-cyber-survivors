import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/core/SupabaseUtils.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/core/SupabaseUtils.ts', import.meta.url);
  });
});
