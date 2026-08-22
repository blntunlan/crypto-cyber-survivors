import { PLAYER_MOVE_SPEED } from '@/game-v2/config/Mvp0Config';

/**
 * The six passive-stat slots (design §5.3, V2-ADR-005).
 *
 * They are a capacity separate from the four ability slots: a passive can never
 * consume an ability slot and vice versa (V2-ADR-040).
 */
export const PASSIVE_SLOT_COUNT = 6;

/** A passive reaches at most five levels (design §5.3). */
export const PASSIVE_MAX_LEVEL = 5;

/** Reserved code for an empty slot; no passive may claim it. */
export const EMPTY_PASSIVE_CODE = 0;

/** Identity codes are hashed as one byte per slot, so `1..255` is the range. */
export const MAX_PASSIVE_CODE = 255;

export type PassiveSlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type PassiveLevel = 1 | 2 | 3 | 4 | 5;

/**
 * The registered passive identities. V2-401 adds the remaining nine of the ten
 * vertical-slice identities.
 */
export type PassiveIdentityId = 'move-speed';

export type PassiveDefinition = Readonly<{
  id: PassiveIdentityId;
  /** Stable hash code in `1..255`; never reused once assigned. */
  code: number;
  /**
   * The highest level with an authored effect today. `PassiveLoadoutSystem`
   * refuses to level past it, so a level can never be reached before the table
   * that answers for it exists.
   */
  authoredLevels: PassiveLevel;
}>;

/**
 * Authored player speed per `move-speed` level, indexed by level.
 *
 * Index `0` is the unmodified `PLAYER_MOVE_SPEED`, and each level adds one
 * twelfth of that base. Five levels therefore reach `8.5`, which widens the
 * escape margin over `ENEMY_MOVE_SPEED` (2.2) from 3.8 to 6.3 — a real but
 * bounded change rather than a movement speed that outruns the horde entirely.
 * Every entry is exactly representable in Float32, so the derived speed cannot
 * introduce a rounding difference into replay.
 */
export const PASSIVE_MOVE_SPEED_BY_LEVEL: readonly number[] = Object.freeze([
  PLAYER_MOVE_SPEED,
  6.5,
  7,
  7.5,
  8,
  8.5,
]);

/**
 * The single owner of the `slot * PASSIVE_SLOT_COUNT + index` stride
 * (V2-ADR-040), mirroring `abilityStoreIndex`. `World.passiveSlotIndexOf` is the
 * validating wrapper for live worlds; snapshot readers call this directly.
 */
export const passiveStoreIndex = (slot: number, index: number): number =>
  slot * PASSIVE_SLOT_COUNT + index;

export const isPassiveSlotIndex = (value: number): value is PassiveSlotIndex =>
  Number.isInteger(value) && value >= 0 && value < PASSIVE_SLOT_COUNT;

export const isPassiveLevel = (value: number): value is PassiveLevel =>
  Number.isInteger(value) && value >= 1 && value <= PASSIVE_MAX_LEVEL;
