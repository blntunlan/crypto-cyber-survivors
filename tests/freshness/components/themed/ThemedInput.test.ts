import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/themed/ThemedInput.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/themed/ThemedInput.tsx', import.meta.url);
  });
});
