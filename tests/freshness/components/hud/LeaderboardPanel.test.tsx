import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/hud/LeaderboardPanel.tsx', () => {
  // Freshness checkpoint updated: 2026-04-02 (HUD polish + retro overlay sync).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/hud/LeaderboardPanel.tsx', import.meta.url);
  });
});
