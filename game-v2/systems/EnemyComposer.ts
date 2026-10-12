import { MVP1_ENEMY_REGISTRY } from '@/game-v2/config/EnemyRegistry';
import {
  ELITE_SPAWN_CHANCE,
  MVP0_ENEMY_COMPOSITION_MAX_PICKS,
} from '@/game-v2/config/Mvp0Config';
import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import {
  ELITE_MODIFIER_KINDS,
  ELITE_MODIFIER_NONE,
  type EliteModifierId,
} from '@/game-v2/contracts/EliteModifier';
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
   *
   * `eliteOut`, when passed, is filled in lockstep with `out` (V2-301):
   * for each affordable, `eliteEligible` pick, an independent
   * `ELITE_SPAWN_CHANCE` roll may upgrade it to a uniformly-chosen elite
   * modifier. An elite pick spends no more budget and adds no additional
   * entity — it is the same archetype at the same cost, so it stays
   * inside the composer's existing threat/render-cap guarantees by
   * construction, not by a separate affordability check (V2-ADR-168).
   * Omitted for callers that don't roll elites (e.g. the market spawn
   * path, V2-ADR-170), leaving every pre-`V2-301` caller byte-for-byte
   * unaffected.
   */
  public compose(
    budget: number,
    rng: Pick<DeterministicRng, 'nextInt' | 'nextFloat'>,
    out: EnemyDefinition[],
    eliteOut?: EliteModifierId[]
  ): void {
    if (!Number.isInteger(budget) || budget < 0) {
      throw new RangeError('enemy composition budget must be a non-negative integer');
    }

    out.length = 0;
    if (eliteOut !== undefined) {
      eliteOut.length = 0;
    }
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

      if (eliteOut !== undefined) {
        eliteOut.push(this.rollEliteModifier(chosen, rng));
      }
    }
  }

  private rollEliteModifier(
    definition: EnemyDefinition,
    rng: Pick<DeterministicRng, 'nextInt' | 'nextFloat'>
  ): EliteModifierId {
    if (!definition.eliteEligible) {
      return ELITE_MODIFIER_NONE;
    }

    const roll = rng.nextFloat();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
      throw new RangeError('elite RNG sample must be in [0, 1)');
    }
    if (roll >= ELITE_SPAWN_CHANCE) {
      return ELITE_MODIFIER_NONE;
    }

    const kindIndex = rng.nextInt(ELITE_MODIFIER_KINDS.length);
    const kind = ELITE_MODIFIER_KINDS[kindIndex];
    if (kind === undefined) {
      throw new Error('elite modifier roll is corrupt');
    }
    return kind;
  }
}
