import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/auth/UserSessionService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/auth/UserSessionService.ts', import.meta.url);
  });
});
