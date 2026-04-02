import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/difficulty/DifficultyContext.ts', () => {
  // Freshness checkpoint updated: 2026-04-02 (DifficultyContext reset + UI polish).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/difficulty/DifficultyContext.ts', import.meta.url);
  });
});
