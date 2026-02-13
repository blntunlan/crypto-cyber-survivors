import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:hooks/useResponsiveUI.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('hooks/useResponsiveUI.ts', import.meta.url);
  });
});
