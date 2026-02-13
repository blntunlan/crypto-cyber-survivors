import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../../assertSourceFreshness';

describe('freshness:services/core/metrics/MetricsStorage.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/core/metrics/MetricsStorage.ts', import.meta.url);
  });
});
