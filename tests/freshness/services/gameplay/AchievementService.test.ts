import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/gameplay/AchievementService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/gameplay/AchievementService.ts', import.meta.url);
  });
});
