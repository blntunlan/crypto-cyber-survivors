import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/market/MarketEventManager.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/market/MarketEventManager.ts', import.meta.url);
  });
});
