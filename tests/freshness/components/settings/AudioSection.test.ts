import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/settings/AudioSection.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/settings/AudioSection.tsx', import.meta.url);
  });
});
