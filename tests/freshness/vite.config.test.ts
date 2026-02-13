import { describe, it } from 'vitest';
import { assertSourceFreshness } from './assertSourceFreshness';

describe('freshness:vite.config.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    // Verifies that vite.config.ts has not been modified without updating this test
    assertSourceFreshness('vite.config.ts', import.meta.url);
  });
});
