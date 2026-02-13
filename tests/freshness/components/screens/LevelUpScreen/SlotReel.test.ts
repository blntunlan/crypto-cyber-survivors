import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../../assertSourceFreshness';

describe('freshness:components/screens/LevelUpScreen/SlotReel.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness(
      'components/screens/LevelUpScreen/SlotReel.tsx',
      import.meta.url
    );
  });
});
