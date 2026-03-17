import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/system/SupabaseHealthService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/system/SupabaseHealthService.ts', import.meta.url);
  });
});
