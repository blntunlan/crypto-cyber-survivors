import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/settings/GraphicsSection.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/settings/GraphicsSection.tsx', import.meta.url);
  });
});
