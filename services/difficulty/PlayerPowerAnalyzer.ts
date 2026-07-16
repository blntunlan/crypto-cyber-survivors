import { PLAYER_STATS } from '../../config/PlayerConfig';
import { DIFFICULTY_RUNTIME_CONFIG } from '../../config/difficulty/DifficultyRuntimeConfig';
import { type Player } from '../../types';
import { type WeaponInstance } from '../../types/weapons';

export type PlayerPowerFlowState = 'bored' | 'flow' | 'stressed';

export interface PlayerPowerInput {
  player: Player;
  activeEnemyCount: number;
  maxEnemies: number;
  killStreak: number;
  weapons: ReadonlyArray<WeaponInstance>;
  flowState?: PlayerPowerFlowState;
}

export interface PlayerPowerState {
  playerPower: number;
  offensePower: number;
  defensePower: number;
  counterPressure: number;
  rangedPressure: number;
  screenPressure: number;
  hpPercent: number;
}

const PLAYER_POWER_CONFIG = {
  DAMAGE_SOFT_CAP: PLAYER_STATS.INITIAL_DAMAGE * 4,
  CRIT_SOFT_CAP: 1.5,
  REGEN_SOFT_CAP: 8,
  LEVEL_SOFT_CAP: 25,
  KILL_STREAK_SOFT_CAP: 80,
  MAX_TRACKED_WEAPONS: 2,
  MAX_WEAPON_LEVEL: 5,
} as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const normalizeRange = (value: number, min: number, max: number): number => {
  if (max <= min) return value >= max ? 1 : 0;
  return clamp01((value - min) / (max - min));
};

/**
 * Converts volatile player stats into stable 0-1 pressure signals for the
 * difficulty pipeline. The returned state object is reused every update.
 */
export class PlayerPowerAnalyzer {
  private readonly state: PlayerPowerState = {
    playerPower: 0,
    offensePower: 0,
    defensePower: 0,
    counterPressure: 0,
    rangedPressure: 0,
    screenPressure: 0,
    hpPercent: 1,
  };

  update(input: PlayerPowerInput): PlayerPowerState {
    return this.updateFromValues(
      input.player,
      input.activeEnemyCount,
      input.maxEnemies,
      input.killStreak,
      input.weapons,
      input.flowState
    );
  }

  updateFromValues(
    player: Player,
    activeEnemyCount: number,
    maxEnemies: number,
    killStreak: number,
    weapons: ReadonlyArray<WeaponInstance>,
    flowState?: PlayerPowerFlowState
  ): PlayerPowerState {
    const hpPercent = clamp01(player.hp / Math.max(1, player.maxHp));
    const screenPressure = clamp01(activeEnemyCount / Math.max(1, maxEnemies));

    const damagePower = normalizeRange(
      player.baseDamage,
      PLAYER_STATS.INITIAL_DAMAGE,
      PLAYER_POWER_CONFIG.DAMAGE_SOFT_CAP
    );
    const fireRateScale =
      PLAYER_STATS.INITIAL_FIRE_RATE /
      Math.max(PLAYER_STATS.MAX_FIRE_RATE, player.fireRate);
    const fireRatePower = normalizeRange(fireRateScale, 1, 5);
    const projectilePower = normalizeRange(
      player.projectiles,
      PLAYER_STATS.INITIAL_PROJECTILES,
      PLAYER_STATS.MAX_PROJECTILES
    );
    const areaPower = normalizeRange(
      player.area,
      PLAYER_STATS.INITIAL_AREA,
      PLAYER_STATS.MAX_AREA
    );
    const critPower = normalizeRange(
      player.critChance * player.critDamage,
      PLAYER_STATS.INITIAL_CRIT_CHANCE * PLAYER_STATS.INITIAL_CRIT_DAMAGE,
      PLAYER_POWER_CONFIG.CRIT_SOFT_CAP
    );

    let totalWeaponLevels = 0;
    for (let i = 0; i < weapons.length; i++) {
      totalWeaponLevels += weapons[i]!.level;
    }
    const weaponCountPower = clamp01(
      weapons.length / PLAYER_POWER_CONFIG.MAX_TRACKED_WEAPONS
    );
    const weaponLevelPower = clamp01(
      totalWeaponLevels /
        (PLAYER_POWER_CONFIG.MAX_TRACKED_WEAPONS * PLAYER_POWER_CONFIG.MAX_WEAPON_LEVEL)
    );

    const offensePower = clamp01(
      damagePower * 0.24 +
        fireRatePower * 0.18 +
        projectilePower * 0.18 +
        areaPower * 0.1 +
        critPower * 0.1 +
        weaponCountPower * 0.08 +
        weaponLevelPower * 0.12
    );

    const armorPower = clamp01(player.armor / Math.max(1, PLAYER_STATS.MAX_ARMOR));
    const dodgePower = clamp01(player.dodge / Math.max(0.01, PLAYER_STATS.MAX_DODGE));
    const regenPower = clamp01(player.regen / PLAYER_POWER_CONFIG.REGEN_SOFT_CAP);
    const defensePower = clamp01(
      hpPercent * 0.45 + armorPower * 0.25 + dodgePower * 0.2 + regenPower * 0.1
    );

    const levelPower = normalizeRange(
      player.level,
      PLAYER_STATS.INITIAL_LEVEL,
      PLAYER_POWER_CONFIG.LEVEL_SOFT_CAP
    );
    const momentumPower = clamp01(
      killStreak / PLAYER_POWER_CONFIG.KILL_STREAK_SOFT_CAP
    );
    const flowStress = flowState === 'stressed' ? 1 : flowState === 'flow' ? 0.25 : 0;

    const rawPower = clamp01(
      offensePower * 0.62 + defensePower * 0.18 + levelPower * 0.2
    );
    const relief = flowStress * 0.42 + (1 - hpPercent) * 0.28 + screenPressure * 0.18;
    const playerPower = clamp01(rawPower + momentumPower * 0.1 - flowStress * 0.08);
    const counterPressure = clamp01(
      playerPower * 0.72 + momentumPower * 0.18 + offensePower * 0.1 - relief
    );
    const levelGate = normalizeRange(player.level, 4, 12);
    const rangedPressure = clamp01(
      (counterPressure * 0.75 + offensePower * 0.25 - screenPressure * 0.18) * levelGate
    );

    this.state.playerPower = playerPower;
    this.state.offensePower = offensePower;
    this.state.defensePower = defensePower;
    this.state.counterPressure = counterPressure;
    this.state.rangedPressure = rangedPressure;
    this.state.screenPressure = screenPressure;
    this.state.hpPercent = hpPercent;

    return this.state;
  }

  updateFromTelemetry(
    level: number,
    killsPerMinute: number,
    shotsPerMinute: number,
    hpPercent: number,
    screenPressure: number
  ): PlayerPowerState {
    const config = DIFFICULTY_RUNTIME_CONFIG.player;
    const weights = config.telemetryWeights;
    const mastery = clamp01(killsPerMinute / config.killsPerMinuteReference);
    const levelPower = clamp01(level / config.levelPowerReference);
    const buildPower = clamp01(shotsPerMinute / config.shotsPerMinuteReference);
    const health = clamp01(hpPercent);
    const pressure = clamp01(screenPressure);

    this.state.offensePower = clamp01(
      mastery * weights.offenseMastery + buildPower * weights.offenseBuild
    );
    this.state.defensePower = health;
    this.state.playerPower = clamp01(
      this.state.offensePower * weights.powerOffense +
        health * weights.powerHealth +
        levelPower * weights.powerLevel
    );
    this.state.counterPressure = clamp01(
      this.state.playerPower - pressure * weights.counterScreenRelief
    );
    this.state.rangedPressure = clamp01(
      buildPower - pressure * weights.rangedScreenRelief
    );
    this.state.screenPressure = pressure;
    this.state.hpPercent = health;
    return this.state;
  }

  reset(): void {
    this.state.playerPower = 0;
    this.state.offensePower = 0;
    this.state.defensePower = 0;
    this.state.counterPressure = 0;
    this.state.rangedPressure = 0;
    this.state.screenPressure = 0;
    this.state.hpPercent = 1;
  }
}
