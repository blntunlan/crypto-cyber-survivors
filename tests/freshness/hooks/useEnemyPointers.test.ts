import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:hooks/useEnemyPointers.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('hooks/useEnemyPointers.ts', import.meta.url);
  });
});
