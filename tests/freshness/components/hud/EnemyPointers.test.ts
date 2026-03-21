import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/hud/EnemyPointers.tsx', () => {
  // Freshness checkpoint updated: 2026-03-19 (HUD pointer refactor).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/hud/EnemyPointers.tsx', import.meta.url);
  });
});
