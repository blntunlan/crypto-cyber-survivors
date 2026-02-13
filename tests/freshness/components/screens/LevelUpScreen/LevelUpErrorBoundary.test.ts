import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../../assertSourceFreshness';

describe('freshness:components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness(
      'components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx',
      import.meta.url
    );
  });
});
