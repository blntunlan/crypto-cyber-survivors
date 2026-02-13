import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/themed/LiveTicker.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/themed/LiveTicker.tsx', import.meta.url);
  });
});
