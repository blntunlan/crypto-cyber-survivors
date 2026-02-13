import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/themed/ThemedPanel.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/themed/ThemedPanel.tsx', import.meta.url);
  });
});
