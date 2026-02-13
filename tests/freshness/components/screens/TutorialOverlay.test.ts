import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/screens/TutorialOverlay.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/screens/TutorialOverlay.tsx', import.meta.url);
  });
});
