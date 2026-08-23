import {
  type AbilityActivation,
  type AbilitySlotIndex,
  type AbilityTier,
} from '@/game-v2/contracts/AbilitySlot';
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';

/**
 * One occupied ability slot's display-relevant state (design §5.1,
 * V2-ADR-047). The HUD derives its binding label from `index`/`activation`
 * rather than reading a precomputed string (V2-ADR-048).
 */
export type AbilitySlotReadout = Readonly<{
  index: AbilitySlotIndex;
  activation: AbilityActivation;
  tier: AbilityTier;
}>;

/**
 * Cheap, allocation-light read of the authoritative simulation.
 *
 * Everything here is derived from `World` and the lifecycle on demand; the
 * readout is never a second source of truth. `nearest*` fields are `null` when
 * no such entity exists, and the player fields read zero before `start()`.
 */
export type GameV2RuntimeReadout = Readonly<{
  tick: number;
  phase: GameV2Phase;
  playerX: number;
  playerY: number;
  playerHealth: number;
  playerMaxHealth: number;
  playerLevel: number;
  weaponDamage: number;
  moveSpeed: number;
  moveSpeedLevel: number;
  moveSpeedUpgradable: boolean;
  invulnerabilityTicks: number;
  dashCooldownTicks: number;
  enemyCount: number;
  projectileCount: number;
  xpPickupCount: number;
  nearestEnemyX: number | null;
  nearestEnemyY: number | null;
  nearestXpPickupX: number | null;
  nearestXpPickupY: number | null;
  /** Length `ABILITY_SLOT_COUNT`; `null` at an empty slot index. */
  abilitySlots: readonly (AbilitySlotReadout | null)[];
}>;

/**
 * The readout plus the canonical state hash. Computing the hash copies the whole
 * world, so it is kept out of `GameV2RuntimeReadout` and off the per-frame path.
 */
export type GameV2DebugSnapshot = GameV2RuntimeReadout &
  Readonly<{
    stateHash: string;
  }>;

export type GameV2DebugSurface = Readonly<{
  getSnapshot: () => GameV2DebugSnapshot;
}>;

declare global {
  interface Window {
    gameV2Debug?: GameV2DebugSurface;
  }
}
