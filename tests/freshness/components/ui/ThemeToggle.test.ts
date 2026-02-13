import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/ui/ThemeToggle.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ui/ThemeToggle.tsx', import.meta.url);
  });
});
