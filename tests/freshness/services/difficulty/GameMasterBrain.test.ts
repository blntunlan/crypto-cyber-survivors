import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/difficulty/GameMasterBrain.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/difficulty/GameMasterBrain.ts', import.meta.url);
  });
});
