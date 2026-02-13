import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/hud/MilestoneAnnouncer.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/hud/MilestoneAnnouncer.tsx', import.meta.url);
  });
});
