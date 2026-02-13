import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/gameplay/ShopService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/gameplay/ShopService.ts', import.meta.url);
  });
});
