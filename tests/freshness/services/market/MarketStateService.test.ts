import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/market/MarketStateService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/market/MarketStateService.ts', import.meta.url);
  });
});
