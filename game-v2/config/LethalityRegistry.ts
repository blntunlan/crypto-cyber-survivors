import {
  assertCombatLethalityProfile,
  type CombatLethalityProfile,
} from '@/game-v2/contracts/CombatLethalityProfile';
import {
  BRUTE_ENEMY_CONTACT_DAMAGE,
  ENEMY_CONTACT_COOLDOWN_TICKS,
  ENEMY_CONTACT_DAMAGE,
  MVP0_ENEMY_SPAWN_BUDGET,
  MVP0_MAX_LIVE_ENEMIES,
  PLAYER_MAX_HEALTH,
  SWARMLING_ENEMY_CONTACT_DAMAGE,
} from '@/game-v2/config/Mvp0Config';
import { LEVERAGE_MODES, type LeverageMode } from '@/game-v2/contracts/PositionContext';

/**
 * The five leverage modes' lethality profiles (design §7.3, `V2-202`).
 *
 * `1×` reproduces today's exact constants byte-for-byte (V2-ADR-092): every
 * pre-existing headless/test call site that never locks a real position
 * defaults to leverage `1` (`UNSPECIFIED_POSITION_CONTEXT`), so it must
 * behave exactly as it did before this task.
 *
 * `playerMaxHealth` is the only dial that varies with leverage
 * (`enemyDamageMultiplier`/`playerArmor` stay fixed at `1`/`0` across all
 * five modes, V2-ADR-093): leverage is literally the divisor of the health
 * budget, and keeping the other two fixed is what makes "no double
 * scaling" true by construction. `V2-405` (MVP-4) tunes the five profiles
 * for real balance — this task derives the mechanism and the `1×` anchor,
 * not the final numbers.
 */

/**
 * The single lethality composer (design line 262): exactly one
 * multiplication by `enemyDamageMultiplier`, exactly one reduction by
 * `(1 - playerArmor)`, a safety floor at zero. No other code path may scale
 * incoming damage (V2-ADR-094).
 *
 * Takes only the two fields it reads, not the whole profile — the same
 * shape both a fully-assembled `CombatLethalityProfile` and the
 * in-progress values `buildProfile` composes before `incomingDamageEnvelope`
 * itself exists satisfy without a cast.
 */
export const resolveIncomingDamage = (
  profile: Pick<CombatLethalityProfile, 'enemyDamageMultiplier' | 'playerArmor'>,
  rawDamage: number
): number => {
  if (!Number.isFinite(rawDamage) || rawDamage < 0) {
    throw new RangeError('raw incoming damage must be finite and non-negative');
  }

  const scaled = rawDamage * profile.enemyDamageMultiplier;
  const mitigated = scaled * (1 - profile.playerArmor);

  return Math.max(0, mitigated);
};

/**
 * Builds one leverage mode's profile. The four placeholder fields
 * (`encounterPressureLimit`, `encounterComplexityLimit`,
 * `liquidationDistance`, `rewardCeiling`) are each derived from a real
 * existing constant or an alias of an already-derived field, never
 * invented (V2-ADR-095): no system reads them yet, so any number placed
 * here cannot itself be validated against real behavior.
 */
const buildProfile = (leverage: LeverageMode): CombatLethalityProfile => {
  const enemyDamageMultiplier = 1;
  const playerArmor = 0;
  const playerMaxHealth = Math.round(PLAYER_MAX_HEALTH / leverage);

  // `incomingDamageEnvelope` is a pure function of the enemy registry's own
  // authored min/max contact damage run through this same composer
  // (V2-ADR-096), so it cannot drift from what the composer actually
  // produces the way a separately hand-authored range could.
  const incomingDamageEnvelope = Object.freeze({
    min: resolveIncomingDamage(
      { enemyDamageMultiplier, playerArmor },
      SWARMLING_ENEMY_CONTACT_DAMAGE
    ),
    max: resolveIncomingDamage(
      { enemyDamageMultiplier, playerArmor },
      BRUTE_ENEMY_CONTACT_DAMAGE
    ),
  });

  const recoveryToleranceTicks =
    Math.floor(playerMaxHealth / ENEMY_CONTACT_DAMAGE) * ENEMY_CONTACT_COOLDOWN_TICKS;

  return assertCombatLethalityProfile({
    leverage,
    playerMaxHealth,
    playerArmor,
    enemyDamageMultiplier,
    incomingDamageEnvelope,
    recoveryToleranceTicks,
    // No encounter system exists yet (V2-207+): identical across modes
    // today, tied to the real existing live-enemy cap and per-interval
    // composition spend rather than an invented per-leverage curve.
    encounterPressureLimit: MVP0_MAX_LIVE_ENEMIES,
    encounterComplexityLimit: MVP0_ENEMY_SPAWN_BUDGET,
    // No real price-distance math exists yet (needs entry price plus
    // volatility): the health-equivalent buffer stands in until it does.
    liquidationDistance: playerMaxHealth,
    // No run-points economy exists yet (V2-306+, MVP-3): the raw leverage
    // value stands in until real settlement math replaces it.
    rewardCeiling: leverage,
  });
};

export const LEVERAGE_LETHALITY_PROFILES: Readonly<
  Record<LeverageMode, CombatLethalityProfile>
> = Object.freeze(
  Object.fromEntries(
    LEVERAGE_MODES.map(leverage => [leverage, buildProfile(leverage)])
  ) as Record<LeverageMode, CombatLethalityProfile>
);

/**
 * A `Map` lookup, not `LEVERAGE_LETHALITY_PROFILES[leverage]`: `Map.get`'s
 * return type always includes `| undefined` regardless of how narrow the
 * key type is, so this throwing guard stays meaningful to `tsc` even though
 * every real `LeverageMode` value is registered — mirrors
 * `AbilityRegistry.byId`'s identical precedent for the same reason.
 */
const profilesByLeverage = new Map<LeverageMode, CombatLethalityProfile>(
  LEVERAGE_MODES.map(leverage => [leverage, LEVERAGE_LETHALITY_PROFILES[leverage]])
);

export const resolveLethalityProfile = (
  leverage: LeverageMode
): CombatLethalityProfile => {
  const profile = profilesByLeverage.get(leverage);

  if (profile === undefined) {
    throw new RangeError(
      `no lethality profile is registered for ${leverage}x leverage`
    );
  }

  return profile;
};
