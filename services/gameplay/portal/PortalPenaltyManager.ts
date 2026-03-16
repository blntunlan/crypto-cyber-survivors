import { PORTAL_V2_CONFIG } from '../PortalSystemV2';
import { Logger } from '../../system/Logger';
import { EventBus } from '../../core/EventBus';

/**
 * PortalPenaltyManager — tracks portal rejections and applies difficulty penalties.
 *
 * Extracted from PortalSystemV2 rejection tracking logic.
 */
export class PortalPenaltyManager {
  private portalsRejected = 0;
  private spawnRateMultiplier = 1.0;
  private speedMultiplier = 1.0;

  /**
   * Apply penalty for rejecting a portal.
   */
  applyRejectionPenalty(): void {
    const penalties = PORTAL_V2_CONFIG.REJECTION_PENALTIES;
    const penalty = penalties[Math.min(this.portalsRejected, penalties.length - 1)];

    if (!penalty) return;

    this.spawnRateMultiplier += penalty.spawnRateIncrease;
    this.speedMultiplier += penalty.speedIncrease;
    this.portalsRejected++;

    Logger.warn(
      `[PortalPenaltyManager] Portal rejected (${this.portalsRejected}/${PORTAL_V2_CONFIG.MAX_REJECTIONS})`,
      {
        spawnPenalty: this.spawnRateMultiplier,
        speedPenalty: this.speedMultiplier,
      }
    );

    EventBus.emit('portalRejected', {
      rejectionCount: this.portalsRejected,
      spawnRateMultiplier: this.spawnRateMultiplier,
      speedMultiplier: this.speedMultiplier,
    });
  }

  /**
   * Get effective cooldown extension from rejections.
   */
  getCooldownExtension(): number {
    const penalties = PORTAL_V2_CONFIG.REJECTION_PENALTIES;
    let totalExtension = 0;
    for (let i = 0; i < this.portalsRejected && i < penalties.length; i++) {
      totalExtension += penalties[i]?.cooldownExtension ?? 0;
    }
    return totalExtension;
  }

  getPortalsRejected(): number {
    return this.portalsRejected;
  }

  getDifficultyPenalty(): { spawnRateMultiplier: number; speedMultiplier: number } {
    return {
      spawnRateMultiplier: this.spawnRateMultiplier,
      speedMultiplier: this.speedMultiplier,
    };
  }

  reset(): void {
    this.portalsRejected = 0;
    this.spawnRateMultiplier = 1.0;
    this.speedMultiplier = 1.0;
  }
}
