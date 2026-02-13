import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/auth/SecurityUtils.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/auth/SecurityUtils.ts', import.meta.url);
  });
});
