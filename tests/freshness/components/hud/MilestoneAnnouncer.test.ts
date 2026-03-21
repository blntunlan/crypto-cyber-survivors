import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/hud/MilestoneAnnouncer.tsx', () => {
  // Freshness checkpoint updated: 2026-03-19 (milestone UI changes).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/hud/MilestoneAnnouncer.tsx', import.meta.url);
  });
});
