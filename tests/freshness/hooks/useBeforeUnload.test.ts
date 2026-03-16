import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:hooks/useBeforeUnload.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    // Freshness marker updated after beforeunload legacy cleanup.
    assertSourceFreshness('hooks/useBeforeUnload.ts', import.meta.url);
  });
});
