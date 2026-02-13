import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:components/SEO.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/SEO.tsx', import.meta.url);
  });
});
