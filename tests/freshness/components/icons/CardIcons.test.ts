import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/icons/CardIcons.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/icons/CardIcons.tsx', import.meta.url);
  });
});
