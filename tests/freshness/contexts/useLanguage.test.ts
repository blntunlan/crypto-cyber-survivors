import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:contexts/useLanguage.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('contexts/useLanguage.ts', import.meta.url);
  });
});
