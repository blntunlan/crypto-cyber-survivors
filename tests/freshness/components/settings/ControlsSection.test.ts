import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/settings/ControlsSection.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/settings/ControlsSection.tsx', import.meta.url);
  });
});
