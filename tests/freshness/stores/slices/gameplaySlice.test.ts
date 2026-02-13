import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:stores/slices/gameplaySlice.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('stores/slices/gameplaySlice.ts', import.meta.url);
  });
});
