import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../../assertSourceFreshness';

describe('freshness:services/combat/physics/PhysicsContext.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/combat/physics/PhysicsContext.ts', import.meta.url);
  });
});
