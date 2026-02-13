import { describe, it } from 'vitest';
import { assertSourceFreshness } from './assertSourceFreshness';

describe('freshness:vitest.config.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    // Verifies that vitest.config.ts has not been modified without updating this test
    assertSourceFreshness('vitest.config.ts', import.meta.url);
  });
});
