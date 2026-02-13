import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/screens/DocScreen.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/screens/DocScreen.tsx', import.meta.url);
  });
});
