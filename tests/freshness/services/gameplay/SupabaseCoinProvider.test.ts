import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/gameplay/SupabaseCoinProvider.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/gameplay/SupabaseCoinProvider.ts', import.meta.url);
  });
});
