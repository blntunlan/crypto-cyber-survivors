import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/ui/CryptoSelector.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ui/CryptoSelector.tsx', import.meta.url);
  });
});
