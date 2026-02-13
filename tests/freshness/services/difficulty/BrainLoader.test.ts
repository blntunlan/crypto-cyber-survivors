import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/difficulty/BrainLoader.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/difficulty/BrainLoader.ts', import.meta.url);
  });
});
