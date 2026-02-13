import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/interfaces/IPhysicsSubsystems.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/interfaces/IPhysicsSubsystems.ts', import.meta.url);
  });
});
