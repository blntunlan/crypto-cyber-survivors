import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:contexts/GameContext.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('contexts/GameContext.tsx', import.meta.url);
  });
});
