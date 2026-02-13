import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/ui/TutorialTooltip.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ui/TutorialTooltip.tsx', import.meta.url);
  });
});
