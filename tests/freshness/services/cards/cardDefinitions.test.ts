import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

// Touchpoint synced on 2026-04-02 after retro reward tuning.
describe('freshness:services/cards/cardDefinitions.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/cards/cardDefinitions.ts', import.meta.url);
  });
});
