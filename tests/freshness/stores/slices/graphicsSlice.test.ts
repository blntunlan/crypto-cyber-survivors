import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:stores/slices/graphicsSlice.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('stores/slices/graphicsSlice.ts', import.meta.url);
  });
});
