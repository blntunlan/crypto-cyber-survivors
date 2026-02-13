import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:contexts/ThemeContext.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('contexts/ThemeContext.tsx', import.meta.url);
  });
});
