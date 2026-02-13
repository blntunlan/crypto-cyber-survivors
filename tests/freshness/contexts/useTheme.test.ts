import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:contexts/useTheme.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('contexts/useTheme.ts', import.meta.url);
  });
});
