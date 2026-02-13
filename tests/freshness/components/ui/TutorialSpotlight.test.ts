import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/ui/TutorialSpotlight.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ui/TutorialSpotlight.tsx', import.meta.url);
  });
});
