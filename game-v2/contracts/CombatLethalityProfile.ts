import { type LeverageMode } from '@/game-v2/contracts/PositionContext';

/**
 * One leverage mode's resolved combat lethality profile (design §7.3,
 * `V2-202`).
 *
 * `playerMaxHealth`, `playerArmor`, and `enemyDamageMultiplier` are the
 * three fields `CombatSystem` actually reads. The remaining four fields
 * have no gameplay reader yet — no encounter system exists before
 * `V2-207`, no economy/liquidation system before `V2-306`, and no
 * regen/heal mechanic exists anywhere in `game-v2/**` — and are each
 * derived from a real existing constant or an alias of an already-derived
 * field, documented as placeholders (V2-ADR-095), never an invented
 * number.
 */
export type CombatLethalityProfile = Readonly<{
  leverage: LeverageMode;
  /** Consumed by `CombatSystem.resetPlayer`. */
  playerMaxHealth: number;
  /** Consumed by `resolveIncomingDamage`. `0..1`, fraction of damage absorbed. */
  playerArmor: number;
  /** Consumed by `resolveIncomingDamage`. Multiplies raw authored attack damage. */
  enemyDamageMultiplier: number;
  /** Informational only (V2-ADR-096): the composer applied to the enemy registry's authored min/max contact damage. */
  incomingDamageEnvelope: Readonly<{ min: number; max: number }>;
  /** No reader yet: ticks of continuous worst-case unmitigated contact before death. */
  recoveryToleranceTicks: number;
  /** No reader yet: placeholder for `V2-207`+'s encounter system. */
  encounterPressureLimit: number;
  /** No reader yet: placeholder for `V2-207`+'s encounter system. */
  encounterComplexityLimit: number;
  /** No reader yet: placeholder for real price-distance math. */
  liquidationDistance: number;
  /** No reader yet: placeholder for `V2-306`+'s run-points economy. */
  rewardCeiling: number;
}>;

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Validates one lethality profile's shape and field ranges. */
export const assertCombatLethalityProfile = (
  value: unknown
): CombatLethalityProfile => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('combat lethality profile must be an object');
  }

  const candidate = value as Partial<CombatLethalityProfile>;

  if (
    typeof candidate.leverage !== 'number' ||
    !isFiniteNonNegative(candidate.leverage) ||
    candidate.leverage <= 0 ||
    !Number.isInteger(candidate.leverage)
  ) {
    throw new RangeError(
      'combat lethality profile leverage must be a positive integer'
    );
  }

  if (
    !isFiniteNonNegative(candidate.playerMaxHealth) ||
    candidate.playerMaxHealth <= 0
  ) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile playerMaxHealth must be finite and positive`
    );
  }

  if (!isFiniteNonNegative(candidate.playerArmor) || (candidate.playerArmor ?? 0) > 1) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile playerArmor must be within 0..1`
    );
  }

  if (
    !isFiniteNonNegative(candidate.enemyDamageMultiplier) ||
    candidate.enemyDamageMultiplier <= 0
  ) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile enemyDamageMultiplier must be finite and positive`
    );
  }

  // Read as `unknown` rather than through the `Partial<CombatLethalityProfile>`
  // cast above: that cast only promises "this field, if present, has the
  // right shape or is `undefined`," which makes a `null`/wrong-shape check
  // against it look statically unreachable to `tsc`, even though the actual
  // caller-supplied `value` this function exists to validate could still
  // hold either.
  const envelope = candidate.incomingDamageEnvelope as unknown;
  const envelopeShape =
    typeof envelope === 'object' && envelope !== null
      ? (envelope as Partial<{ min: unknown; max: unknown }>)
      : null;

  if (
    envelopeShape === null ||
    !isFiniteNonNegative(envelopeShape.min) ||
    !isFiniteNonNegative(envelopeShape.max) ||
    envelopeShape.min > envelopeShape.max
  ) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile incomingDamageEnvelope must be a valid min/max range`
    );
  }

  if (
    !isFiniteNonNegative(candidate.recoveryToleranceTicks) ||
    !Number.isInteger(candidate.recoveryToleranceTicks)
  ) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile recoveryToleranceTicks must be a non-negative integer`
    );
  }

  if (
    !isFiniteNonNegative(candidate.encounterPressureLimit) ||
    !Number.isInteger(candidate.encounterPressureLimit)
  ) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile encounterPressureLimit must be a non-negative integer`
    );
  }

  if (
    !isFiniteNonNegative(candidate.encounterComplexityLimit) ||
    !Number.isInteger(candidate.encounterComplexityLimit)
  ) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile encounterComplexityLimit must be a non-negative integer`
    );
  }

  if (!isFiniteNonNegative(candidate.liquidationDistance)) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile liquidationDistance must be finite and non-negative`
    );
  }

  if (!isFiniteNonNegative(candidate.rewardCeiling)) {
    throw new RangeError(
      `${candidate.leverage}x lethality profile rewardCeiling must be finite and non-negative`
    );
  }

  return Object.freeze({
    leverage: candidate.leverage as LeverageMode,
    playerMaxHealth: candidate.playerMaxHealth,
    playerArmor: candidate.playerArmor as number,
    enemyDamageMultiplier: candidate.enemyDamageMultiplier,
    incomingDamageEnvelope: Object.freeze({
      min: envelopeShape.min,
      max: envelopeShape.max,
    }),
    recoveryToleranceTicks: candidate.recoveryToleranceTicks,
    encounterPressureLimit: candidate.encounterPressureLimit,
    encounterComplexityLimit: candidate.encounterComplexityLimit,
    liquidationDistance: candidate.liquidationDistance,
    rewardCeiling: candidate.rewardCeiling,
  });
};
