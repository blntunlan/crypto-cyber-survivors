import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from '../config/DirectorConfigV1';

export type EnemyCostUnit = {
  id: string;
  threatCost: number;
};

export type EnemyStatMultipliers = {
  healthMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
};

export type EncounterStatMultipliers = EnemyStatMultipliers & {
  spawnDensityMultiplier: number;
};

export const NEUTRAL_ENEMY_STAT_MULTIPLIERS: EnemyStatMultipliers = {
  healthMultiplier: 1,
  damageMultiplier: 1,
  speedMultiplier: 1,
};

export const NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS: EncounterStatMultipliers = {
  ...NEUTRAL_ENEMY_STAT_MULTIPLIERS,
  spawnDensityMultiplier: 1,
};

export const ENEMY_COST_UNITS: readonly EnemyCostUnit[] = [
  { id: 'SCOUT', threatCost: 1 },
  { id: 'PURSUER', threatCost: 2 },
  { id: 'RANGED', threatCost: 3 },
  { id: 'ELITE', threatCost: 5 },
];

export const ENCOUNTER_COST_UNITS = {
  primary: 8,
  support: 4,
  alpha: 10,
} as const;

const MINIMUM_MULTIPLIER = 1;

const clamp = (value: number, maximum: number): number =>
  Math.min(maximum, Math.max(MINIMUM_MULTIPLIER, value));

export const clampEnemyStatMultipliers = (
  multipliers: EnemyStatMultipliers,
  config: DirectorConfigV1 = DIRECTOR_CONFIG_V1
): EnemyStatMultipliers => ({
  healthMultiplier: clamp(
    multipliers.healthMultiplier,
    config.enemyStatCaps.normalHealth
  ),
  damageMultiplier: clamp(
    multipliers.damageMultiplier,
    config.enemyStatCaps.normalDamage
  ),
  speedMultiplier: clamp(multipliers.speedMultiplier, config.enemyStatCaps.normalSpeed),
});

/**
 * Encounter cards cannot multiply every stat axis in one event. The last
 * configured axes are neutralised if a content card exceeds the contract cap.
 */
export const clampEncounterStatMultipliers = (
  multipliers: EncounterStatMultipliers,
  config: DirectorConfigV1 = DIRECTOR_CONFIG_V1
): EncounterStatMultipliers => {
  const enemyMultipliers = clampEnemyStatMultipliers(multipliers, config);
  const clamped = {
    ...enemyMultipliers,
    spawnDensityMultiplier: clamp(
      multipliers.spawnDensityMultiplier,
      config.encounters.maximumSpawnDensityMultiplier
    ),
  };
  const orderedAxes = [
    'spawnDensityMultiplier',
    'healthMultiplier',
    'damageMultiplier',
    'speedMultiplier',
  ] as const;
  let activeAxisCount = 0;

  for (const axis of orderedAxes) {
    if (clamped[axis] <= MINIMUM_MULTIPLIER) continue;
    activeAxisCount += 1;
    if (activeAxisCount > config.encounters.maximumConcurrentStatSpikes) {
      clamped[axis] = MINIMUM_MULTIPLIER;
    }
  }

  return clamped;
};
