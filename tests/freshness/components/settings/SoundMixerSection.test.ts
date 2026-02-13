import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/settings/SoundMixerSection.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/settings/SoundMixerSection.tsx', import.meta.url);
  });
});
