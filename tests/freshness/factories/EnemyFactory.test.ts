import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

// Touchpoint: refreshed after EnemyFactory tuning on 2026-04-02 to satisfy freshness checks.

describe('freshness:factories/EnemyFactory.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('factories/EnemyFactory.ts', import.meta.url);
  });
});
