import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/admin/AdminDashboard.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/admin/AdminDashboard.tsx', import.meta.url);
  });
});
