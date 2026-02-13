import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:components/ParticleDebugPanel.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ParticleDebugPanel.tsx', import.meta.url);
  });
});
