import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/audio/HowlerManager.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/audio/HowlerManager.ts', import.meta.url);
  });
});
