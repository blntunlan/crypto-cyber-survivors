import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:hooks/useAppInitialization.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('hooks/useAppInitialization.ts', import.meta.url);
  });
});
