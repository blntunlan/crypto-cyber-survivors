import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:contexts/useUser.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('contexts/useUser.ts', import.meta.url);
  });
});
