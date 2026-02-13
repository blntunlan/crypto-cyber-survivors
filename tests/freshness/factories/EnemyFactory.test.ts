import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:factories/EnemyFactory.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('factories/EnemyFactory.ts', import.meta.url);
  });
});
