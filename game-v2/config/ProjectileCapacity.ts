import { MVP1_ABILITY_REGISTRY } from '@/game-v2/config/AbilityRegistry';
import { PROJECTILE_LIFETIME_TICKS } from '@/game-v2/config/Mvp0Config';
import { ABILITY_SLOT_COUNT } from '@/game-v2/contracts/AbilitySlot';

/**
 * The concurrent projectile bound, derived from the ability registry
 * (`V2-111`, V2-ADR-078).
 *
 * This lives in its own module rather than in `Mvp0Config.ts` because
 * `AbilityRegistry.ts` already imports its cadence constants from
 * `Mvp0Config.ts`; deriving the bound there would close an import cycle.
 * Depending on both keeps the graph a DAG.
 *
 * The bound is load-bearing, not advisory: `RenderSnapshotWriter` throws when
 * `projectileCount` exceeds the render category's capacity, and since
 * V2-ADR-035 the animation loop cancels itself and surfaces the message rather
 * than repeating the throw every frame. Exceeding this number ends the run.
 */

/**
 * Projectiles alive at once for one weapon firing every `cooldownTicks`:
 * `ceil(lifetime / cooldown)` are still in flight when the next one is fired,
 * plus that new one.
 */
export const concurrentProjectilesFor = (cooldownTicks: number): number => {
  if (!Number.isFinite(cooldownTicks) || cooldownTicks <= 0) {
    throw new RangeError('cooldownTicks must be a positive finite tick count');
  }

  return Math.ceil(PROJECTILE_LIFETIME_TICKS / cooldownTicks) + 1;
};

/**
 * The worst case a player can reach: the `ABILITY_SLOT_COUNT` fastest authored
 * identities held simultaneously, each at its fastest authored tier.
 *
 * Derived from the registry rather than hand-written so a future identity with
 * a faster cadence raises the bound instead of silently exceeding it. The
 * pre-`V2-111` value was `16`, derived when MVP-0 had a single 30-tick starter
 * weapon; `V2-107` then authored `needle-projectile` (fastest cadence `2`
 * ticks, implying 46 concurrent projectiles) without revisiting it. Only the
 * single-firing-slot defect `V2-111` removes was keeping that unreachable.
 */
export const MVP1_MAX_LIVE_PROJECTILES = MVP1_ABILITY_REGISTRY.ids
  .map(id =>
    concurrentProjectilesFor(
      Math.min(
        ...MVP1_ABILITY_REGISTRY.byId(id).tierEffects.map(
          effect => effect.cooldownTicks
        )
      )
    )
  )
  .sort((left, right) => right - left)
  .slice(0, ABILITY_SLOT_COUNT)
  .reduce((total, count) => total + count, 0);
