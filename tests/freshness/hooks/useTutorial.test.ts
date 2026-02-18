import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:hooks/useTutorial.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    // Timestamp on this test intentionally tracks source freshness checks.
    assertSourceFreshness('hooks/useTutorial.ts', import.meta.url);
  });
});
