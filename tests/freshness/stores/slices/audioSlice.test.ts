import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:stores/slices/audioSlice.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('stores/slices/audioSlice.ts', import.meta.url);
  });
});
