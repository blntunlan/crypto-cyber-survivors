import { ENEMY_SPAWN } from '../../config/EnemyConfig';
import { type MarketPosition } from '../../types';
import { type EnemyId } from '../../config/EnemyRegistry';
import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import { type GameplaySnapshot, type SpawnIntent, type SpawnPlan } from './contracts';
import { SeededRng } from './SeededRng';
import { type RuntimeDifficultySnapshot } from '../../types/runtimeDifficulty';

export type SpawnPlanWorldInput = {
  width: number;
  height: number;
  activeEnemies: number;
  maxActiveEnemies: number;
  position: MarketPosition;
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
const COUNTER_ENEMY_TYPES: readonly EnemyId[] = ['sandwich', 'flash_loan', 'rugpull'];
const MINIMUM_ENEMY_COST = 1;
const MAXIMUM_POWER_TIER = 3;

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
    const rng = new SeededRng(
      snapshot.spawn.seed ^ input.tick ^ snapshot.meta.revision
    );
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
    const capacity = Math.max(
      0,
      input.world.maxActiveEnemies - input.world.activeEnemies
    );
    const spendableThreat = Math.min(
      Math.max(0, input.snapshot.threat.availableCredits),
      capacity * MINIMUM_ENEMY_COST
    );
    const spawnCount = Math.min(
      capacity,
      Math.floor(spendableThreat / MINIMUM_ENEMY_COST)
    );
    const rng = new SeededRng(input.seed ^ input.tick ^ input.snapshot.revision);
    const intents: SpawnIntent[] = [];
    const useCounterComposition = input.snapshot.encounter.headwindChannels.includes(
      'MULTI_DIRECTIONAL_ENTRIES'
    );
    const composition = useCounterComposition
      ? COUNTER_ENEMY_TYPES
      : ENEMY_TYPES_BY_HEADWIND;
    const difficulty = input.snapshot.threat.target;
    const powerTier = Math.min(MAXIMUM_POWER_TIER, Math.floor(difficulty));

    for (let sequence = 0; sequence < spawnCount; sequence += 1) {
      const enemyType = composition[rng.nextInt(composition.length)]!;
      const position = this.getSpawnPosition(rng, input.world);
      intents.push({
        tick: input.tick,
        sequence,
        enemyType,
        x: position.x,
        y: position.y,
        threatCost: MINIMUM_ENEMY_COST,
        difficulty,
        healthMultiplier: 1,
        damageMultiplier: 1,
        speedMultiplier: 1,
        intent: useCounterComposition ? 'counter' : 'pressure',
        powerTier,
      });
    }

    return {
      revision: input.snapshot.revision,
      seed: input.seed,
      spendableThreat,
      composition,
      statTier: powerTier,
      maxActiveEnemies: input.world.maxActiveEnemies,
      spawnWindowSeconds: 1 / this.config.runtime.updateFrequencyHz,
      intents,
    };
  }

  private getSpawnPosition(
    rng: SeededRng,
    world: SpawnPlanWorldInput
  ): {
    x: number;
    y: number;
  } {
    const edge = rng.nextInt(4);
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
