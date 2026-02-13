import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/admin/EvolutionViewer.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/admin/EvolutionViewer.tsx', import.meta.url);
  });
});
