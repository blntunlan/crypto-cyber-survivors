import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:stores/slices/mobileSlice.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('stores/slices/mobileSlice.ts', import.meta.url);
  });
});
