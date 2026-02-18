import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:components/SEO.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    // Timestamp on this test intentionally tracks source freshness checks.
    assertSourceFreshness('components/SEO.tsx', import.meta.url);
  });
});
