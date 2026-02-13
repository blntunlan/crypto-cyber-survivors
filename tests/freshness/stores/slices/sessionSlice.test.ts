import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:stores/slices/sessionSlice.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('stores/slices/sessionSlice.ts', import.meta.url);
  });
});
