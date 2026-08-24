/**
 * One indicator-event profile's configuration (design §7.4, `V2-203`).
 *
 * The mechanism only — no concrete indicator family (`V2-204`+) or the
 * primary/support composer (`V2-207`) that would give `priority`/
 * `outputKind`/`compatibleWith` a real reader exists yet. This task types
 * and validates them; a concrete profile author sets them meaningfully
 * later (V2-ADR-102).
 */
export type IndicatorEventDirection = 'below' | 'above';

export type IndicatorEventProfile = Readonly<{
  id: string;
  direction: IndicatorEventDirection;
  /** Crossing this in `direction` while `ARMED` starts `CONFIRMING`. */
  entryThreshold: number;
  /** Crossing this in the opposite direction while `ACTIVE` starts `COOLDOWN`. */
  exitThreshold: number;
  /** Ticks the entry condition must hold continuously before `CONFIRMING` promotes to `ACTIVE`. */
  confirmationTicks: number;
  /** Minimum ticks `COOLDOWN` must persist before `ARMED` (also gated by the rearm threshold). */
  cooldownTicks: number;
  /** Added to `exitThreshold` in the recovery direction to derive the rearm threshold. */
  hysteresis: number;
  /** No reader yet: `V2-207`'s primary/support composer. */
  priority: number;
  /** No reader yet: a later spawn/world-event/loot output system. */
  outputKind: string;
  /** No reader yet: `V2-207`'s primary/support composer. Ids of other profiles this one may combine with. */
  compatibleWith: readonly string[];
}>;

const isFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  isFinite(value) && Number.isInteger(value) && value >= 0;

/** Validates one indicator-event profile's shape, field ranges, and the threshold/direction relationship. */
export const assertIndicatorEventProfile = (value: unknown): IndicatorEventProfile => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('indicator event profile must be an object');
  }

  const candidate = value as Partial<IndicatorEventProfile>;

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
    throw new TypeError('indicator event profile id must be a non-empty string');
  }

  if (candidate.direction !== 'below' && candidate.direction !== 'above') {
    throw new RangeError(
      `${candidate.id} indicator event profile direction must be 'below' or 'above'`
    );
  }

  if (!isFinite(candidate.entryThreshold)) {
    throw new RangeError(
      `${candidate.id} indicator event profile entryThreshold must be finite`
    );
  }

  if (!isFinite(candidate.exitThreshold)) {
    throw new RangeError(
      `${candidate.id} indicator event profile exitThreshold must be finite`
    );
  }

  const entryExitValid =
    candidate.direction === 'below'
      ? candidate.exitThreshold >= candidate.entryThreshold
      : candidate.exitThreshold <= candidate.entryThreshold;

  if (!entryExitValid) {
    throw new RangeError(
      `${candidate.id} indicator event profile exitThreshold must be on the recovery side of entryThreshold for direction '${candidate.direction}'`
    );
  }

  if (!isNonNegativeInteger(candidate.confirmationTicks)) {
    throw new RangeError(
      `${candidate.id} indicator event profile confirmationTicks must be a non-negative integer`
    );
  }

  if (!isNonNegativeInteger(candidate.cooldownTicks)) {
    throw new RangeError(
      `${candidate.id} indicator event profile cooldownTicks must be a non-negative integer`
    );
  }

  if (!isFinite(candidate.hysteresis) || candidate.hysteresis < 0) {
    throw new RangeError(
      `${candidate.id} indicator event profile hysteresis must be finite and non-negative`
    );
  }

  if (!isFinite(candidate.priority)) {
    throw new RangeError(
      `${candidate.id} indicator event profile priority must be finite`
    );
  }

  if (
    typeof candidate.outputKind !== 'string' ||
    candidate.outputKind.trim().length === 0
  ) {
    throw new TypeError(
      `${candidate.id} indicator event profile outputKind must be a non-empty string`
    );
  }

  if (
    !Array.isArray(candidate.compatibleWith) ||
    !candidate.compatibleWith.every(entry => typeof entry === 'string')
  ) {
    throw new TypeError(
      `${candidate.id} indicator event profile compatibleWith must be an array of strings`
    );
  }

  return Object.freeze({
    id: candidate.id,
    direction: candidate.direction,
    entryThreshold: candidate.entryThreshold,
    exitThreshold: candidate.exitThreshold,
    confirmationTicks: candidate.confirmationTicks,
    cooldownTicks: candidate.cooldownTicks,
    hysteresis: candidate.hysteresis,
    priority: candidate.priority,
    outputKind: candidate.outputKind,
    compatibleWith: Object.freeze([...candidate.compatibleWith]),
  });
};
