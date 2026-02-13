import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/screens/LandingPageSkeleton.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness(
      'components/screens/LandingPageSkeleton.tsx',
      import.meta.url
    );
  });
});
