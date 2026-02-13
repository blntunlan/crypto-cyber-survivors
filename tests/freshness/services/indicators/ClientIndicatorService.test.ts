import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/indicators/ClientIndicatorService.ts', () => {
  // Freshness checkpoint updated: 2026-02-13.
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness(
      'services/indicators/ClientIndicatorService.ts',
      import.meta.url
    );
  });
});
