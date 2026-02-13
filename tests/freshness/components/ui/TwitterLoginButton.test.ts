import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/ui/TwitterLoginButton.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ui/TwitterLoginButton.tsx', import.meta.url);
  });
});
