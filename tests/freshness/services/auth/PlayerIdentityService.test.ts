import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/auth/PlayerIdentityService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/auth/PlayerIdentityService.ts', import.meta.url);
  });
});
