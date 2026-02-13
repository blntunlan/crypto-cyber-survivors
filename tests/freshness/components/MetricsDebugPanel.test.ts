import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:components/MetricsDebugPanel.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/MetricsDebugPanel.tsx', import.meta.url);
  });
});
