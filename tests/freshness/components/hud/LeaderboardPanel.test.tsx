import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/hud/LeaderboardPanel.tsx', () => {
  // Freshness checkpoint updated: 2026-03-19 (leaderboard lint cleanup).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/hud/LeaderboardPanel.tsx', import.meta.url);
  });
});
