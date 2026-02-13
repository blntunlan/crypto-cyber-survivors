import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/hud/LevelUpFlash.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/hud/LevelUpFlash.tsx', import.meta.url);
  });
});
