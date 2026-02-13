import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:hooks/usePWAInstall.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('hooks/usePWAInstall.ts', import.meta.url);
  });
});
