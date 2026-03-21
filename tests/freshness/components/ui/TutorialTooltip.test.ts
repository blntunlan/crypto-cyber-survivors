import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/ui/TutorialTooltip.tsx', () => {
  // Freshness checkpoint updated: 2026-03-19 (tooltip UX changes).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ui/TutorialTooltip.tsx', import.meta.url);
  });
});
