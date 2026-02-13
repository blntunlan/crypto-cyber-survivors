import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/screens/LegalModals.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/screens/LegalModals.tsx', import.meta.url);
  });
});
