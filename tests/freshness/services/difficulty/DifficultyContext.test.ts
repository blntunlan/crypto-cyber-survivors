import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/difficulty/DifficultyContext.ts', () => {
  // Freshness checkpoint updated: 2026-03-19 (difficulty runtime updates).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/difficulty/DifficultyContext.ts', import.meta.url);
  });
});
