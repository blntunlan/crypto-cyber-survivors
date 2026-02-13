import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../../assertSourceFreshness';

describe('freshness:services/patterns/decorators/IPlayerStats.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/patterns/decorators/IPlayerStats.ts', import.meta.url);
  });
});
