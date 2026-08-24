import { describe, expect, it } from 'vitest';

import { MVP1_ABILITY_REGISTRY } from '@/game-v2/config/AbilityRegistry';
import {
  MVP0_MAX_LIVE_ENEMIES,
  MVP0_WORLD_CAPACITY,
  PROJECTILE_LIFETIME_TICKS,
} from '@/game-v2/config/Mvp0Config';
import {
  MVP1_MAX_LIVE_PROJECTILES,
  concurrentProjectilesFor,
} from '@/game-v2/config/ProjectileCapacity';
import { ABILITY_SLOT_COUNT } from '@/game-v2/contracts/AbilitySlot';

/**
 * `V2-111`, V2-ADR-078.
 *
 * The bound this file pins is load-bearing rather than advisory:
 * `RenderSnapshotWriter` throws when `projectileCount > projectileCapacity`,
 * and since V2-ADR-035 the animation loop cancels itself on a throw. Exceeding
 * it ends the run.
 */
describe('MVP1_MAX_LIVE_PROJECTILES (V2-ADR-078)', () => {
  it('derives the per-weapon concurrent bound from lifetime and cadence', () => {
    // A weapon on a `cd`-tick cadence has `ceil(lifetime / cd)` projectiles
    // still alive when it fires the next one, plus that new one.
    expect(concurrentProjectilesFor(PROJECTILE_LIFETIME_TICKS)).toBe(2);
    expect(concurrentProjectilesFor(PROJECTILE_LIFETIME_TICKS / 2)).toBe(3);
    expect(concurrentProjectilesFor(1)).toBe(PROJECTILE_LIFETIME_TICKS + 1);
  });

  it('rejects a cadence that is not a positive finite tick count', () => {
    expect(() => concurrentProjectilesFor(0)).toThrow(RangeError);
    expect(() => concurrentProjectilesFor(-1)).toThrow(RangeError);
    expect(() => concurrentProjectilesFor(Number.NaN)).toThrow(RangeError);
    expect(() => concurrentProjectilesFor(Number.POSITIVE_INFINITY)).toThrow(
      RangeError
    );
  });

  it('sums the ABILITY_SLOT_COUNT fastest authored cadences', () => {
    const perIdentity = MVP1_ABILITY_REGISTRY.ids.map(id => {
      const definition = MVP1_ABILITY_REGISTRY.byId(id);
      const fastest = Math.min(
        ...definition.tierEffects.map(effect => effect.cooldownTicks)
      );

      return concurrentProjectilesFor(fastest);
    });

    const worstCase = [...perIdentity]
      .sort((left, right) => right - left)
      .slice(0, ABILITY_SLOT_COUNT)
      .reduce((total, count) => total + count, 0);

    expect(MVP1_MAX_LIVE_PROJECTILES).toBe(worstCase);
  });

  it('holds every authored identity/tier pair, not just the starter weapon', () => {
    // The pre-V2-111 bound was 16, derived for MVP-0's single 30-tick starter
    // weapon. `needle-projectile` alone breaks that at every authored tier.
    for (const id of MVP1_ABILITY_REGISTRY.ids) {
      const definition = MVP1_ABILITY_REGISTRY.byId(id);

      for (const effect of definition.tierEffects) {
        expect(concurrentProjectilesFor(effect.cooldownTicks)).toBeLessThanOrEqual(
          MVP1_MAX_LIVE_PROJECTILES
        );
      }
    }
  });

  it('exceeds the stale single-starter-weapon bound it replaces', () => {
    // Guards against a silent revert to 16: the fastest authored identity
    // needs far more than the starter weapon ever did.
    expect(MVP1_MAX_LIVE_PROJECTILES).toBeGreaterThan(16);
  });

  it('fits the worst case inside the world alongside the enemy cap', () => {
    expect(MVP0_WORLD_CAPACITY).toBeGreaterThan(
      MVP1_MAX_LIVE_PROJECTILES + MVP0_MAX_LIVE_ENEMIES + 1
    );
  });
});
