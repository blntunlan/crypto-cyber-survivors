import { describe, expect, it } from 'vitest';

import { MARKET_STALE_THRESHOLD_MS } from '@/game-v2/config/MarketFreshness';

describe('MarketFreshness config', () => {
  it("anchors the stale threshold to DataResilienceService's real value", () => {
    expect(MARKET_STALE_THRESHOLD_MS).toBe(30_000);
  });
});
