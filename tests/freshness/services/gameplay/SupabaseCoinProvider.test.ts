import { describe, it } from 'vitest';

import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/gameplay/SupabaseCoinProvider.ts', () => {
  // Freshness checkpoint updated: 2026-03-19 (coin provider lint cleanup).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/gameplay/SupabaseCoinProvider.ts', import.meta.url);
  });
});
