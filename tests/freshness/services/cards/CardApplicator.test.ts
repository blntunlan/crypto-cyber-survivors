import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/cards/CardApplicator.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/cards/CardApplicator.ts', import.meta.url);
  });
});
