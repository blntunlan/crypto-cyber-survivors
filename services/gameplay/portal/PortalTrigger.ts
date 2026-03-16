import { TimeService } from '../../core/TimeService';
import {
  PORTAL_V2_CONFIG,
  type PortalType,
  type PortalTriggerReason,
} from '../PortalSystemV2';

/**
 * PortalTriggerResult — whether a portal should spawn and why
 */
export interface PortalTriggerResult {
  shouldSpawn: boolean;
  type: PortalType;
  reason: PortalTriggerReason;
}

/**
 * PortalTrigger — owns trigger condition evaluation.
 *
 * Pure logic: given current game state, decides whether to spawn a portal.
 * Extracted from PortalSystemV2.checkTriggerConditions().
 */
export class PortalTrigger {
  /**
   * Check all portal trigger conditions.
   *
   * @param elapsedSeconds Game elapsed time
   * @param currentPnL Current PnL ratio (-1 to 1+)
   * @param portalsOpened Number of portals opened so far
   * @param portalsRejected Number of portals rejected
   * @param outOfFlowStartTime When player left flow state (ms), or null
   * @param isFlashCrashActive Whether a flash crash was detected
   * @param lastWhaleKillTime When the last whale was killed (ms)
   */
  checkTriggerConditions(
    elapsedSeconds: number,
    currentPnL: number,
    portalsOpened: number,
    portalsRejected: number,
    outOfFlowStartTime: number | null,
    isFlashCrashActive: boolean,
    lastWhaleKillTime: number
  ): PortalTriggerResult {
    const config = PORTAL_V2_CONFIG;

    // Priority 1: Max game time reached (forced final portal)
    if (elapsedSeconds >= config.MAX_GAME_TIME) {
      return { shouldSpawn: true, type: 'FORCED', reason: 'MAX_TIME' };
    }

    // Priority 2: Max portals reached (forced if previously rejected all)
    if (
      portalsOpened >= config.MAX_PORTALS - 1 &&
      portalsRejected >= config.MAX_REJECTIONS
    ) {
      return { shouldSpawn: true, type: 'FORCED', reason: 'FORCED_FINAL' };
    }

    // Priority 3: PnL-based triggers
    if (currentPnL >= config.TAKE_PROFIT_THRESHOLD) {
      return { shouldSpawn: true, type: 'TAKE_PROFIT', reason: 'TAKE_PROFIT' };
    }

    if (currentPnL <= config.STOP_LOSS_THRESHOLD) {
      return { shouldSpawn: true, type: 'STOP_LOSS', reason: 'STOP_LOSS' };
    }

    // Priority 4: Flow state - too long outside flow
    if (outOfFlowStartTime !== null) {
      const outOfFlowDuration = (TimeService.getGameTime() - outOfFlowStartTime) / 1000;
      if (outOfFlowDuration >= config.OUT_OF_FLOW_DURATION) {
        return { shouldSpawn: true, type: 'FLOW_EXIT', reason: 'OUT_OF_FLOW' };
      }
    }

    // Priority 5: Post flash crash
    if (isFlashCrashActive) {
      return { shouldSpawn: true, type: 'STOP_LOSS', reason: 'POST_FLASH_CRASH' };
    }

    // Priority 6: Post whale kill (within 30s)
    const timeSinceWhale = (TimeService.getGameTime() - lastWhaleKillTime) / 1000;
    if (timeSinceWhale < 30 && lastWhaleKillTime > 0) {
      return { shouldSpawn: true, type: 'TAKE_PROFIT', reason: 'POST_WHALE_KILL' };
    }

    return { shouldSpawn: false, type: 'TAKE_PROFIT', reason: 'TAKE_PROFIT' };
  }
}
