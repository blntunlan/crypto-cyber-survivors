import { GameStatus } from '../../../types';
import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';

interface CombatPhaseSharedContract {
  deltaTime: number;
  width: number;
  height: number;
  combatSystem: {
    processAutoFire: (
      pool: unknown,
      player: unknown,
      gameState: unknown,
      deltaTime: number,
      width: number,
      height: number
    ) => boolean;
  };
  didAttack?: boolean;
}

export class CombatPhase implements IGameplayPhase<'combat'> {
  public readonly phase = 'combat' as const;

  public execute(input: PhaseInput<'combat'>): BaselinePhaseResult<'combat'> {
    const result = createBaselinePhaseResult(this.phase);
    if (input.context.status !== GameStatus.PLAYING) {
      return result;
    }

    const player = input.context.world.player.current;
    if (!player) {
      return result;
    }

    const s = input.context.world.gameState.current;
    const pool = input.context.world.pool.current;
    const shared = input.shared as unknown as Partial<CombatPhaseSharedContract>;

    if (
      !shared.combatSystem ||
      typeof shared.combatSystem.processAutoFire !== 'function' ||
      typeof shared.deltaTime !== 'number' ||
      typeof shared.width !== 'number' ||
      typeof shared.height !== 'number'
    ) {
      return result;
    }

    // Always allow base auto-fire; WeaponSystem fires separately via events
    shared.didAttack = shared.combatSystem.processAutoFire(
      pool,
      player,
      s,
      shared.deltaTime,
      shared.width,
      shared.height
    );

    return result;
  }
}
