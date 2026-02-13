import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:components/ComboDebugPanel.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ComboDebugPanel.tsx', import.meta.url);
  });
});
