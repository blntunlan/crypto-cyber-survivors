import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:components/ErrorBoundary.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/ErrorBoundary.tsx', import.meta.url);
  });
});
