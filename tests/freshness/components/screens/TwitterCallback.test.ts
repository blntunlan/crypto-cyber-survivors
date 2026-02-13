import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/screens/TwitterCallback.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/screens/TwitterCallback.tsx', import.meta.url);
  });
});
