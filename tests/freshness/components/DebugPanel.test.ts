import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:components/DebugPanel.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/DebugPanel.tsx', import.meta.url);
  });
});
