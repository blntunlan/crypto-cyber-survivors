import { type AbilityTierEffect } from '@/game-v2/contracts/AbilityTierEffect';

/**
 * The four unified ability slots (design §5.1, V2-ADR-005).
 *
 * A slot is either empty or holds one ability identity, its registered
 * activation kind, and its current tier. Occupancy, activation, and tier are
 * stored in `World` and moved only by `AbilityLoadoutSystem` (V2-ADR-036).
 */
export const ABILITY_SLOT_COUNT = 4;

/** Every ability has exactly three total tiers (design §5.2, V2-ADR-006). */
export const ABILITY_MAX_TIER = 3;

/** Reserved code for an empty slot; no ability may claim it (V2-ADR-037). */
export const EMPTY_ABILITY_CODE = 0;

/** Identity codes are hashed as one byte per slot, so `1..255` is the range. */
export const MAX_ABILITY_CODE = 255;

export type AbilitySlotIndex = 0 | 1 | 2 | 3;

/**
 * `active` abilities display their `1`–`4` binding; `auto` abilities are
 * autonomous weapons and display `AUTO`.
 */
export type AbilityActivation = 'active' | 'auto';

export type AbilityTier = 1 | 2 | 3;

/**
 * The registered ability identities. V2-106 and V2-107 add the remaining seven
 * of the eight vertical-slice identities.
 */
export type AbilityIdentityId = 'starter-projectile';

export type AbilityDefinition = Readonly<{
  id: AbilityIdentityId;
  /** Stable hash code in `1..255`; never reused once assigned (V2-ADR-037). */
  code: number;
  activation: AbilityActivation;
  /**
   * The highest tier with authored effects today. `AbilityLoadoutSystem`
   * refuses to advance past it, so a tier can never be reached before the block
   * that authors its behavior exists (V2-ADR-038).
   */
  authoredTiers: AbilityTier;
  /**
   * Index `tier - 1`; length must equal `authoredTiers` (V2-ADR-044,
   * registry-enforced in `createAbilityRegistry`).
   */
  tierEffects: readonly AbilityTierEffect[];
}>;

/**
 * The single owner of the `slot * ABILITY_SLOT_COUNT + index` stride
 * (V2-ADR-036). `World.abilitySlotIndexOf` is the validating wrapper for live
 * worlds; snapshot readers such as the validator and the hasher call this
 * directly because they hold no `World`.
 */
export const abilityStoreIndex = (slot: number, index: number): number =>
  slot * ABILITY_SLOT_COUNT + index;

export const isAbilitySlotIndex = (value: number): value is AbilitySlotIndex =>
  Number.isInteger(value) && value >= 0 && value < ABILITY_SLOT_COUNT;

export const isAbilityTier = (value: number): value is AbilityTier =>
  Number.isInteger(value) && value >= 1 && value <= ABILITY_MAX_TIER;

export const isAbilityActivation = (value: unknown): value is AbilityActivation =>
  value === 'active' || value === 'auto';
