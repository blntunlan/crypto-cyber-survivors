import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/indicators/ClientIndicatorService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/indicators/ClientIndicatorService.ts', import.meta.url);
  });
});
