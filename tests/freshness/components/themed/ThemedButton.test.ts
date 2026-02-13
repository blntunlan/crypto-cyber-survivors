import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/themed/ThemedButton.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/themed/ThemedButton.tsx', import.meta.url);
  });
});
