import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:contexts/UserContext.tsx', () => {
  // Freshness checkpoint updated: 2026-03-19 (context flow changes).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('contexts/UserContext.tsx', import.meta.url);
  });
});
