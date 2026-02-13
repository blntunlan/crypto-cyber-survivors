import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/settings/LanguageSection.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/settings/LanguageSection.tsx', import.meta.url);
  });
});
