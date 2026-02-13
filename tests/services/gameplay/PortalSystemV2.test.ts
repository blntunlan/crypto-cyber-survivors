/**
 * @fileoverview Tests for PortalSystemV2
 * @description Dynamic exit point system with max 3 portals, rejection penalties
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PORTAL_V2_CONFIG,
  createPortalSystemV2,
} from '../../../services/gameplay/PortalSystemV2';
import { EventBus } from '../../../services/core/EventBus';
import { TimeService } from '../../../services/core/TimeService';

// Mock EventBus
vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
}));

// Mock TimeService
vi.mock('../../../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn(() => 0),
  },
}));

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PortalSystemV2', () => {
  let portalSystem: ReturnType<typeof createPortalSystemV2>;

  beforeEach(() => {
    vi.clearAllMocks();
    portalSystem = createPortalSystemV2();
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
  });

  afterEach(() => {
    portalSystem.reset();
  });

  describe('Initialization', () => {
    it('should start with no active portal', () => {
      const state = portalSystem.getPortalState();
      expect(state.isActive).toBe(false);
    });

    it('should start with zero portals opened', () => {
      const session = portalSystem.getSessionState();
      expect(session.portalsOpened).toBe(0);
    });

    it('should have correct config values', () => {
      expect(PORTAL_V2_CONFIG.MAX_PORTALS).toBe(3);
      expect(PORTAL_V2_CONFIG.MAX_REJECTIONS).toBe(3);
      expect(PORTAL_V2_CONFIG.FIRST_PORTAL_MIN_TIME).toBe(300);
      expect(PORTAL_V2_CONFIG.MAX_GAME_TIME).toBe(600);
    });

    it('should have correct PnL thresholds', () => {
      expect(PORTAL_V2_CONFIG.TAKE_PROFIT_THRESHOLD).toBe(0.1);
      expect(PORTAL_V2_CONFIG.STOP_LOSS_THRESHOLD).toBe(-0.15);
    });
  });

  describe('Portal Spawning Conditions', () => {
    it('should not spawn portal before minimum time', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(100); // < 300

      portalSystem.update(16, 0.15, 800, 600); // High PnL but too early

      const state = portalSystem.getPortalState();
      expect(state.isActive).toBe(false);
    });

    it('should spawn TAKE_PROFIT portal when PnL exceeds threshold after min time', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350); // > 300

      portalSystem.update(16, 0.15, 800, 600); // +15% > 10% threshold

      const state = portalSystem.getPortalState();
      expect(state.isActive).toBe(true);
      expect(state.type).toBe('TAKE_PROFIT');
      expect(EventBus.emit).toHaveBeenCalledWith(
        'portalOpened',
        expect.objectContaining({ type: 'TAKE_PROFIT' })
      );
    });

    it('should spawn STOP_LOSS portal when PnL drops below threshold', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);

      portalSystem.update(16, -0.2, 800, 600); // -20% < -15% threshold

      const state = portalSystem.getPortalState();
      expect(state.isActive).toBe(true);
      expect(state.type).toBe('STOP_LOSS');
    });

    it('should spawn FORCED portal at max game time', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(601); // > 600 seconds

      portalSystem.update(16, 0, 800, 600);

      const state = portalSystem.getPortalState();
      expect(state.isActive).toBe(true);
      expect(state.type).toBe('FORCED');
    });
  });

  describe('Portal Limits', () => {
    it('should track portals opened', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);

      portalSystem.update(16, 0.15, 800, 600);
      const session = portalSystem.getSessionState();

      expect(session.portalsOpened).toBe(1);
    });

    it('should return correct portals remaining', () => {
      expect(portalSystem.getPortalsRemaining()).toBe(3);

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      expect(portalSystem.getPortalsRemaining()).toBe(2);
    });
  });

  describe('Portal Entry', () => {
    it('should handle portal entry correctly', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      const result = portalSystem.enterPortal();

      expect(result.exitType).toBe('portal');
      expect(result.portalType).toBe('TAKE_PROFIT');
      expect(EventBus.emit).toHaveBeenCalledWith(
        'portalEntered',
        expect.objectContaining({ type: 'TAKE_PROFIT' })
      );
    });

    it('should close portal after entry', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      portalSystem.enterPortal();

      const state = portalSystem.getPortalState();
      expect(state.isActive).toBe(false);
    });
  });

  describe('Portal Rejection (Expiration)', () => {
    it('should apply rejection penalty when portal expires', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600); // Spawn portal

      // Simulate portal expiring (time runs out)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(400);
      portalSystem.update(30000, 0.15, 800, 600); // 30 seconds pass

      const session = portalSystem.getSessionState();
      expect(session.portalsRejected).toBe(1);
    });

    it('should increase difficulty penalty on rejection', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      // Expire the portal
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(400);
      portalSystem.update(30000, 0.15, 800, 600);

      const penalty = portalSystem.getDifficultyPenalty();
      expect(penalty.spawnRateMultiplier).toBeGreaterThan(1);
    });
  });

  describe('Difficulty Penalties', () => {
    it('should return no penalty with zero rejections', () => {
      const penalty = portalSystem.getDifficultyPenalty();
      expect(penalty.spawnRateMultiplier).toBe(1);
      expect(penalty.speedMultiplier).toBe(1);
    });

    it('should have configured rejection penalties', () => {
      expect(PORTAL_V2_CONFIG.REJECTION_PENALTIES).toHaveLength(3);
      expect(PORTAL_V2_CONFIG.REJECTION_PENALTIES[0].spawnRateIncrease).toBe(0.2);
    });
  });

  describe('Player Death', () => {
    it('should handle player death correctly', () => {
      portalSystem.addRawCoins(1000);
      const result = portalSystem.onPlayerDeath(false);

      expect(result.exitType).toBe('death');
      expect(result.portalType).toBeNull();
      // Death penalty is 0.5 (50%)
      expect(result.breakdown.raw).toBeLessThanOrEqual(500);
    });

    it('should give no coins for AFK death', () => {
      portalSystem.addRawCoins(1000);
      const result = portalSystem.onPlayerDeath(true);

      expect(result.exitType).toBe('afk_death');
      expect(result.total).toBe(0);
    });
  });

  describe('Coin Calculation', () => {
    it('should track raw coins', () => {
      portalSystem.addRawCoins(100);
      expect(portalSystem.getRawCoins()).toBe(100);
    });

    it('should track combo bonus', () => {
      portalSystem.addComboBonus(50);
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      const result = portalSystem.enterPortal();
      expect(result.breakdown.comboBonus).toBe(50);
    });

    it('should apply TAKE_PROFIT bonus', () => {
      portalSystem.addRawCoins(100);
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      const result = portalSystem.enterPortal();
      expect(result.breakdown.portalBonus).toBeGreaterThan(0);
    });
  });

  describe('Portal Cooldown', () => {
    it('should respect cooldown between portals', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600); // First portal

      // Enter and close portal
      portalSystem.enterPortal();

      // Try immediately
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(351);
      portalSystem.update(16, 0.15, 800, 600);

      const state = portalSystem.getPortalState();
      expect(state.isActive).toBe(false); // Should be on cooldown
    });

    it('should allow portal after cooldown', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);
      portalSystem.enterPortal();

      // After cooldown (180+ seconds)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(550);
      portalSystem.update(16, 0.15, 800, 600);

      const state = portalSystem.getPortalState();
      expect(state.isActive).toBe(true);
    });
  });

  describe('Forced Portal', () => {
    it('should spawn forced portal at max game time', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(601);
      portalSystem.update(16, 0, 800, 600);

      const state = portalSystem.getPortalState();
      expect(state.type).toBe('FORCED');
    });

    it('should have larger radius for forced portal', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(601);
      portalSystem.update(16, 0, 800, 600);

      const state = portalSystem.getPortalState();
      expect(state.radius).toBe(60); // Forced portals are larger
    });
  });

  describe('Session State', () => {
    it('should track session statistics', () => {
      const session = portalSystem.getSessionState();

      expect(session).toHaveProperty('portalsOpened');
      expect(session).toHaveProperty('portalsRejected');
      expect(session).toHaveProperty('lastPortalTime');
      expect(session).toHaveProperty('difficultyPenalty');
    });

    it('should update portalsOpened on portal spawn', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      const session = portalSystem.getSessionState();
      expect(session.portalsOpened).toBe(1);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      // Modify state
      portalSystem.addRawCoins(500);
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      // Reset
      portalSystem.reset();

      const state = portalSystem.getPortalState();
      const session = portalSystem.getSessionState();

      expect(state.isActive).toBe(false);
      expect(session.portalsOpened).toBe(0);
      expect(portalSystem.getRawCoins()).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    it('should correctly report portal active status', () => {
      expect(portalSystem.isPortalActive()).toBe(false);

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      expect(portalSystem.isPortalActive()).toBe(true);
    });

    it('should correctly identify final portal', () => {
      expect(portalSystem.isFinalPortal()).toBe(false);

      // Open 2 portals
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);
      portalSystem.enterPortal();

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(550);
      portalSystem.update(16, 0.15, 800, 600);
      portalSystem.enterPortal();

      expect(portalSystem.isFinalPortal()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero coins gracefully', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      const result = portalSystem.enterPortal();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative PnL correctly', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, -0.5, 800, 600); // Very negative

      const state = portalSystem.getPortalState();
      expect(state.type).toBe('STOP_LOSS');
    });

    it('should provide debug state', () => {
      const debug = portalSystem.getDebugState();

      expect(debug).toHaveProperty('isActive');
      expect(debug).toHaveProperty('type');
      expect(debug).toHaveProperty('portalsOpened');
      expect(debug).toHaveProperty('pnl');
    });
  });
});
