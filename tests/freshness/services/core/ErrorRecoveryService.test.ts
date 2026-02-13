import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/core/ErrorRecoveryService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/core/ErrorRecoveryService.ts', import.meta.url);
  });
});
