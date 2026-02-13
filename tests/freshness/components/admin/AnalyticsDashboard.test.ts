import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/admin/AnalyticsDashboard.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/admin/AnalyticsDashboard.tsx', import.meta.url);
  });
});
