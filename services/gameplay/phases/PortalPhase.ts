import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';
import { PortalSystemV2 } from '../PortalSystemV2';

/**
 * PortalPhase — updates portal system state.
 *
 * Extracted from GameEngine.tsx update loop:
 *   - PortalSystemV2.update(deltaTime, pnl, width, height)
 *
 * Note: Portal collision detection and extraction remain in GameEngine
 * because they depend on player position and trigger game-over flow.
 */
export class PortalPhase implements IGameplayPhase<'portal'> {
  public readonly phase = 'portal' as const;
  private readonly result = createBaselinePhaseResult(this.phase);

  public execute(input: PhaseInput<'portal'>): BaselinePhaseResult<'portal'> {
    const { clock, dimensions, marketData } = input.context;

    PortalSystemV2.update(
      clock.deltaMs,
      marketData.pnl,
      dimensions.width,
      dimensions.height
    );

    return this.result;
  }
}
