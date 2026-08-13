import { ENEMY_SPAWN } from '../../config/EnemyConfig';
import { type MarketPosition } from '../../types';
import { type EnemyId } from '../../config/EnemyRegistry';
import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import { type GameplaySnapshot, type SpawnIntent, type SpawnPlan } from './contracts';
import { resolveEnemyThreatCost } from './encounters/EnemyCostCatalog';
import { resolveComposition, type HeadwindChannel } from './encounters/HeadwindCatalog';
import { SeededRng } from './SeededRng';
import { type RuntimeDifficultySnapshot } from '../../types/runtimeDifficulty';

export type SpawnPlanWorldInput = {
  width: number;
  height: number;
  activeEnemies: number;
  maxActiveEnemies: number;
  position: MarketPosition;
  /**
   * §10 GREEN_LANE: the safe route must stay safe, so the planner rejects any
   * spawn point inside it rather than letting the lane fill up behind you.
   */
  isBlockedPosition?: (x: number, y: number) => boolean;
};

export type CurrentSpawnPlanBuildInput = {
  tick: number;
  seed: number;
  snapshot: GameplaySnapshot;
  world: SpawnPlanWorldInput;
};

export type RuntimeSpawnPlanBuildInput = {
  tick: number;
  snapshot: RuntimeDifficultySnapshot;
  world: SpawnPlanWorldInput;
};

const ENEMY_TYPES_BY_HEADWIND: readonly EnemyId[] = [
  'bear',
  'bull',
  'fud',
  'mev_bot',
  'rugpull',
  'liquidator',
];
const MINIMUM_ENEMY_COST = 1;
const MAXIMUM_POWER_TIER = 3;
const SPAWN_EDGE_COUNT = 4;

/**
 * Converts a Director snapshot into deterministic, bounded spawn intents.
 * It accepts no raw market indicators, PnL, leverage, or player-power data.
 */
export class SpawnPlanBuilder {
  private readonly config: DirectorConfigV1;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
  }

  public build(input: RuntimeSpawnPlanBuildInput): SpawnPlan {
    const snapshot = input.snapshot;
    const capacity = Math.max(
      0,
      Math.min(snapshot.spawn.maximumActiveEnemies, input.world.maxActiveEnemies) -
        input.world.activeEnemies
    );
    const spendableThreat = Math.min(
      Math.max(0, snapshot.spawn.reservedCredits),
      capacity * MINIMUM_ENEMY_COST
    );
    const spawnCount = Math.min(
      capacity,
      Math.floor(spendableThreat / MINIMUM_ENEMY_COST)
    );
    const rng = new SeededRng(snapshot.spawn.seed ^ snapshot.meta.revision);
    const intents: SpawnIntent[] = [];
    const directives = snapshot.spawn.directives;
    const composition: readonly string[] =
      directives.length > 0
        ? directives.map(directive => directive.archetype)
        : ENEMY_TYPES_BY_HEADWIND;

    for (let sequence = 0; sequence < spawnCount; sequence += 1) {
      const directive = directives[sequence % Math.max(1, directives.length)];
      const enemyType =
        directive?.archetype ??
        composition[rng.nextInt(composition.length)] ??
        ENEMY_TYPES_BY_HEADWIND[0]!;
      const position = this.getSpawnPosition(rng, input.world);
      intents.push({
        tick: input.tick,
        sequence,
        enemyType,
        x: position.x,
        y: position.y,
        threatCost: MINIMUM_ENEMY_COST,
        difficulty: snapshot.pressure.total,
        healthMultiplier: snapshot.enemy.healthMultiplier,
        damageMultiplier: snapshot.enemy.damageMultiplier,
        speedMultiplier: snapshot.enemy.speedMultiplier,
        intent: directive?.intent ?? 'pressure',
        powerTier: snapshot.enemy.behaviorTier,
      });
    }

    return {
      revision: snapshot.meta.revision,
      seed: snapshot.spawn.seed,
      spendableThreat,
      composition,
      statTier: snapshot.enemy.behaviorTier,
      maxActiveEnemies: Math.min(
        snapshot.spawn.maximumActiveEnemies,
        input.world.maxActiveEnemies
      ),
      spawnWindowSeconds: snapshot.spawn.spawnWindowSeconds,
      intents,
    };
  }

  public buildCurrent(input: CurrentSpawnPlanBuildInput): SpawnPlan {
    const snapshot = input.snapshot;
    const enemy = snapshot.enemy;
    const channels = snapshot.encounter.headwindChannels as readonly HeadwindChannel[];
    const composition = resolveComposition(channels);
    const useCounterComposition = channels.includes('MULTI_DIRECTIONAL_ENTRIES');
    const densityMultiplier = channels.includes('SPAWN_DENSITY')
      ? enemy.spawnDensityMultiplier
      : 1;
    const capacity = Math.max(
      0,
      Math.floor(
        (input.world.maxActiveEnemies - input.world.activeEnemies) * densityMultiplier
      )
    );
    const availableThreat = Math.max(0, snapshot.threat.availableCredits);
    const rng = new SeededRng(input.seed ^ snapshot.revision);
    const intents: SpawnIntent[] = [];
    const difficulty = snapshot.threat.target;
    const powerTier = Math.min(MAXIMUM_POWER_TIER, enemy.behaviorTier);
    let spendableThreat = 0;

    for (let slot = 0; slot < capacity; slot += 1) {
      const enemyType = composition[rng.nextInt(composition.length)]!;
      const threatCost = resolveEnemyThreatCost(enemyType);
      const position = this.getSpawnPosition(
        rng,
        input.world,
        useCounterComposition ? slot % SPAWN_EDGE_COUNT : undefined
      );
      // An unaffordable archetype skips its slot instead of ending the tick,
      // so one expensive roll cannot starve the whole spawn window.
      if (spendableThreat + threatCost > availableThreat) continue;
      if (input.world.isBlockedPosition?.(position.x, position.y) === true) continue;

      spendableThreat += threatCost;
      intents.push({
        tick: input.tick,
        sequence: intents.length,
        enemyType,
        x: position.x,
        y: position.y,
        threatCost,
        difficulty,
        healthMultiplier: enemy.healthMultiplier,
        damageMultiplier: enemy.damageMultiplier,
        speedMultiplier: enemy.speedMultiplier,
        intent: useCounterComposition ? 'counter' : 'pressure',
        powerTier,
      });
    }

    return {
      revision: snapshot.revision,
      seed: input.seed,
      spendableThreat,
      composition,
      statTier: powerTier,
      maxActiveEnemies: input.world.maxActiveEnemies,
      spawnWindowSeconds: 1 / this.config.runtime.updateFrequencyHz,
      intents,
    };
  }

  /**
   * §11 "çok yönlü giriş": the channel spreads the wave across all four edges
   * in turn instead of letting the seed clump it, so the pressure genuinely
   * arrives from multiple directions rather than just looking different.
   */
  private getSpawnPosition(
    rng: SeededRng,
    world: SpawnPlanWorldInput,
    forcedEdge?: number
  ): {
    x: number;
    y: number;
  } {
    const edge = forcedEdge ?? rng.nextInt(4);
    const safeOffset = Math.max(
      ENEMY_SPAWN.SPAWN_DISTANCE,
      ENEMY_SPAWN.MIN_SAFE_OFFSET
    );
    const horizontalCoordinate = rng.nextFloat() * world.width;
    const verticalCoordinate = rng.nextFloat() * world.height;

    switch (edge) {
      case 0:
        return { x: horizontalCoordinate, y: -safeOffset };
      case 1:
        return { x: horizontalCoordinate, y: world.height + safeOffset };
      case 2:
        return { x: -safeOffset, y: verticalCoordinate };
      default:
        return { x: world.width + safeOffset, y: verticalCoordinate };
    }
  }
}
