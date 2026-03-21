import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/auth/SupabaseAuthService.ts', () => {
  // Freshness checkpoint updated: 2026-03-19 (auth service changes).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/auth/SupabaseAuthService.ts', import.meta.url);
  });
});
