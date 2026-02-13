import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/audio/ComboSounds.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/audio/ComboSounds.ts', import.meta.url);
  });
});
