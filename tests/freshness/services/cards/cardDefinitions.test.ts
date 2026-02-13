import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/cards/cardDefinitions.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/cards/cardDefinitions.ts', import.meta.url);
  });
});
