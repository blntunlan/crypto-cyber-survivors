import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/auth/ProfileService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/auth/ProfileService.ts', import.meta.url);
  });
});
