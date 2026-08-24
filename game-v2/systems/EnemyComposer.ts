import { MVP1_ENEMY_REGISTRY } from '@/game-v2/config/EnemyRegistry';
import { MVP0_ENEMY_COMPOSITION_MAX_PICKS } from '@/game-v2/config/Mvp0Config';
import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import { type DeterministicRng } from '@/game-v2/runtime/DeterministicRng';

/**
 * Spends a bounded budget across the enemy registry's archetypes
 * (`V2-108`, V2-ADR-070).
 *
 * `compose` writes into a caller-owned, pre-sized output array rather than
 * returning a new one, so the per-interval spawn cadence allocates nothing
 * (the project's RAF-loop discipline, `CLAUDE.md`).
 */
export class EnemyComposer {
  private readonly registry: readonly EnemyDefinition[];

  public constructor(registry: readonly EnemyDefinition[] = MVP1_ENEMY_REGISTRY) {
    if (registry.length === 0) {
      throw new RangeError('enemy composer requires a non-empty registry');
    }

    this.registry = registry;
  }

  /**
   * Fills `out` (clearing it first) with the archetypes to spawn this
   * interval, greedily drawing one affordable archetype uniformly at random
   * per pick until none fits the remaining budget.
   *
   * Bounded by `MVP0_ENEMY_COMPOSITION_MAX_PICKS`: every archetype's cost is
   * a positive integer (`assertEnemyDefinition`), so remaining budget
   * strictly decreases each pick and the loop cannot outlive that bound —
   * the cap is a defensive backstop, not a value the loop is expected to
   * reach.
   */
  public compose(
    budget: number,
    rng: Pick<DeterministicRng, 'nextInt'>,
    out: EnemyDefinition[]
  ): void {
    if (!Number.isInteger(budget) || budget < 0) {
      throw new RangeError('enemy composition budget must be a non-negative integer');
    }

    out.length = 0;
    let remaining = budget;

    for (let pick = 0; pick < MVP0_ENEMY_COMPOSITION_MAX_PICKS; pick += 1) {
      let affordableCount = 0;

      for (const definition of this.registry) {
        if (definition.cost <= remaining) {
          affordableCount += 1;
        }
      }

      if (affordableCount === 0) {
        return;
      }

      let chosenOrdinal = rng.nextInt(affordableCount);
      let chosen: EnemyDefinition | undefined;

      for (const definition of this.registry) {
        if (definition.cost > remaining) {
          continue;
        }
        if (chosenOrdinal === 0) {
          chosen = definition;
          break;
        }
        chosenOrdinal -= 1;
      }

      if (chosen === undefined) {
        throw new Error('enemy composition pick is corrupt');
      }

      out.push(chosen);
      remaining -= chosen.cost;
    }
  }
}
