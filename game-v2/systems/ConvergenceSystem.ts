import {
  COMBAT_KILL_BUFFER_CAPACITY,
  CONVERGENCE_MAX_CYCLE_TICKS,
  CONVERGENCE_MIN_CYCLE_TICKS,
  CONVERGENCE_THRESHOLD,
} from '@/game-v2/config/Mvp0Config';
import { type CombatStepResult } from '@/game-v2/contracts/CombatStepResult';
import { type ConvergenceStepResult } from '@/game-v2/contracts/ConvergenceStepResult';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { assertStepContext } from '@/game-v2/systems/StepContextValidator';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const PLAYER_ENTITY_MASK = ComponentMask.Player;

const isFiniteNonNegative = (value: number): boolean =>
  Number.isFinite(value) && value >= 0;

/**
 * Market-independent Convergence (`V2-109`).
 *
 * Accumulates XP-equivalent kill points (V2-ADR-075) directly on the
 * player's `World` row (V2-ADR-073) and latches a "reached" edge once
 * `(tick >= CONVERGENCE_MIN_CYCLE_TICKS) && (convergence >=
 * CONVERGENCE_THRESHOLD || tick >= CONVERGENCE_MAX_CYCLE_TICKS)`
 * (V2-ADR-074). No market or indicator state is read anywhere in this
 * system, matching its own name. There is no boss yet to consume the
 * latch — the runtime only exposes it.
 */
export class ConvergenceSystem {
  private readonly result: ConvergenceStepResult = {
    convergenceReachedThisTick: false,
  };

  public resetPlayer(world: World, playerEntity: EntityId): void {
    const slot = world.slotOf(playerEntity);
    const mask = world.masks[slot];

    if (mask === undefined || (mask & PLAYER_ENTITY_MASK) !== PLAYER_ENTITY_MASK) {
      throw new RangeError('player entity is missing required components');
    }

    world.convergence[slot] = 0;
    world.convergenceReached[slot] = 0;
  }

  public step(
    world: World,
    playerEntity: EntityId,
    combatResult: Readonly<CombatStepResult>,
    context: StepContext
  ): ConvergenceStepResult {
    assertStepContext(context);

    if (typeof combatResult.playerDied !== 'boolean') {
      throw new TypeError('combat playerDied must be a boolean');
    }

    this.result.convergenceReachedThisTick = false;

    // Terminal death dominates the tick, mirroring ProgressionSystem
    // (V2-ADR-027): a simultaneous kill must not accrue Convergence or flip
    // the latch on the tick the run ends.
    if (combatResult.playerDied) {
      return this.result;
    }

    const { killCount, killXp } = combatResult;

    if (
      !Number.isSafeInteger(killCount) ||
      killCount < 0 ||
      killCount > COMBAT_KILL_BUFFER_CAPACITY
    ) {
      throw new RangeError('killCount is outside the supported bounded range');
    }

    if (!(killXp instanceof Float32Array)) {
      throw new TypeError('combat kill storage must use a Float32Array buffer');
    }

    if (killCount > killXp.length) {
      throw new RangeError('killCount exceeds combat kill storage bounds');
    }

    const playerSlot = world.slotOf(playerEntity);
    const playerMask = world.masks[playerSlot];

    if (
      playerMask === undefined ||
      (playerMask & PLAYER_ENTITY_MASK) !== PLAYER_ENTITY_MASK
    ) {
      throw new RangeError('player entity is missing required components');
    }

    const currentConvergence = world.convergence[playerSlot];

    if (currentConvergence === undefined || !isFiniteNonNegative(currentConvergence)) {
      throw new RangeError('player convergence state must be finite and non-negative');
    }

    // Validate the complete kill batch before accruing any of it.
    let accrued = 0;
    for (let i = 0; i < killCount; i += 1) {
      const xp = killXp[i];

      if (xp === undefined || !isFiniteNonNegative(xp)) {
        throw new RangeError('kill XP must be finite and non-negative');
      }

      accrued += xp;
    }

    const nextConvergence = currentConvergence + accrued;

    if (!isFiniteNonNegative(Math.fround(nextConvergence))) {
      throw new RangeError('convergence exceeds finite Float32 storage');
    }

    world.convergence[playerSlot] = nextConvergence;

    const alreadyReached = world.convergenceReached[playerSlot] === 1;

    if (!alreadyReached) {
      const pastMinFloor = context.tick >= CONVERGENCE_MIN_CYCLE_TICKS;
      const pastThreshold = nextConvergence >= CONVERGENCE_THRESHOLD;
      const pastMaxCeiling = context.tick >= CONVERGENCE_MAX_CYCLE_TICKS;

      if (pastMinFloor && (pastThreshold || pastMaxCeiling)) {
        world.convergenceReached[playerSlot] = 1;
        this.result.convergenceReachedThisTick = true;
      }
    }

    return this.result;
  }
}
