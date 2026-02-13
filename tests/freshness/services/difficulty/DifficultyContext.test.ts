import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/difficulty/DifficultyContext.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/difficulty/DifficultyContext.ts', import.meta.url);
  });
});
