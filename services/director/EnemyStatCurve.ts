import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import {
  clampEnemyStatMultipliers,
  type EncounterStatMultipliers,
} from './encounters/EnemyCostCatalog';

export const MAXIMUM_ENEMY_BEHAVIOR_TIER = 3;

export type EnemyStatInput = {
  survivalPressure: number;
  doomStacks: number;
  encounterModifiers: EncounterStatMultipliers;
  /** §11: a telegraphed burst is the only way speed spikes above the curve. */
  hasSpeedBurst: boolean;
  /** §11: elite synergy raises behaviour tier, never the stat caps. */
  hasEliteSynergy: boolean;
};

/**
 * The burst is deliberately modest: it must read as a spike against the curve
 * while the §9 cap still decides the ceiling.
 */
const SPEED_BURST_MULTIPLIER = 1.15;
const ELITE_SYNERGY_TIER_BONUS = 1;

export type EnemyStatSnapshot = EncounterStatMultipliers & {
  behaviorTier: number;
  /** True while any axis sits on its contract cap. */
  isCapped: boolean;
};

const clampUnit = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/**
 * Sole owner of normal enemy stat multipliers (contract §9 / §18).
 *
 * Stats ride the time-based survival curve toward the contract caps and stop
 * there; past the cap the run gets harder through composition, area denial, and
 * Doom, never through further stat growth (§8). Market pressure, greed, and
 * headwind deliberately do not appear here — they buy threat credits, which is
 * what stops an indicator from being applied twice (§21.5).
 */
export class EnemyStatCurve {
  private readonly config: DirectorConfigV1;
  private readonly floorPressure: number;
  private readonly snapshot: EnemyStatSnapshot = {
    healthMultiplier: 1,
    damageMultiplier: 1,
    speedMultiplier: 1,
    spawnDensityMultiplier: 1,
    behaviorTier: 0,
    isCapped: false,
  };

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
    this.floorPressure = config.survival.pressurePoints[0]?.pressure ?? 0;
  }

  public update(input: EnemyStatInput): EnemyStatSnapshot {
    const caps = this.config.enemyStatCaps;
    const progress = this.getProgress(input.survivalPressure);
    const doomStacks = Math.max(0, Math.floor(input.doomStacks));
    const modifiers = input.encounterModifiers;

    const raw = clampEnemyStatMultipliers(
      {
        healthMultiplier:
          (1 + progress * (caps.normalHealth - 1)) * modifiers.healthMultiplier,
        damageMultiplier:
          (1 + progress * (caps.normalDamage - 1)) * modifiers.damageMultiplier,
        speedMultiplier:
          (1 + progress * (caps.normalSpeed - 1)) *
          modifiers.speedMultiplier *
          (input.hasSpeedBurst ? SPEED_BURST_MULTIPLIER : 1),
      },
      this.config
    );

    this.snapshot.healthMultiplier = raw.healthMultiplier;
    this.snapshot.damageMultiplier = raw.damageMultiplier;
    this.snapshot.speedMultiplier = raw.speedMultiplier;
    this.snapshot.spawnDensityMultiplier = Math.min(
      this.config.encounters.maximumSpawnDensityMultiplier,
      Math.max(1, modifiers.spawnDensityMultiplier)
    );
    this.snapshot.behaviorTier = Math.min(
      MAXIMUM_ENEMY_BEHAVIOR_TIER,
      Math.round(progress * 2) +
        doomStacks +
        (input.hasEliteSynergy ? ELITE_SYNERGY_TIER_BONUS : 0)
    );
    this.snapshot.isCapped =
      raw.healthMultiplier >= caps.normalHealth ||
      raw.damageMultiplier >= caps.normalDamage ||
      raw.speedMultiplier >= caps.normalSpeed;

    return this.snapshot;
  }

  public getSnapshot(): EnemyStatSnapshot {
    return this.snapshot;
  }

  public reset(): void {
    this.snapshot.healthMultiplier = 1;
    this.snapshot.damageMultiplier = 1;
    this.snapshot.speedMultiplier = 1;
    this.snapshot.spawnDensityMultiplier = 1;
    this.snapshot.behaviorTier = 0;
    this.snapshot.isCapped = false;
  }

  private getProgress(survivalPressure: number): number {
    const span = this.config.survival.pressureCap - this.floorPressure;
    if (span <= 0) return 0;
    return clampUnit((survivalPressure - this.floorPressure) / span);
  }
}
