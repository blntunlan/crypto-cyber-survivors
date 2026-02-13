import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:hooks/useDifficultyV2.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('hooks/useDifficultyV2.ts', import.meta.url);
  });
});
