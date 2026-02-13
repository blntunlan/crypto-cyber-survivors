import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/themed/ThemedText.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/themed/ThemedText.tsx', import.meta.url);
  });
});
