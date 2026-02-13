import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/hub/HubIcons.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/hub/HubIcons.tsx', import.meta.url);
  });
});
