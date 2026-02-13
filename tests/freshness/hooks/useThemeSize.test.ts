import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:hooks/useThemeSize.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('hooks/useThemeSize.ts', import.meta.url);
  });
});
