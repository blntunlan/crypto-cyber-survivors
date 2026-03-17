import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:contexts/UserContext.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('contexts/UserContext.tsx', import.meta.url);
  });
});
