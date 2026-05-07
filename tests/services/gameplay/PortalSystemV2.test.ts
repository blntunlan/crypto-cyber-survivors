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

type PortalTestGlobals = {
  __portalTestHandlers?: Record<string, ((...args: unknown[]) => void)[]>;
};

// Use globalThis to avoid TDZ issues with vi.mock hoisting
const _g = globalThis as unknown as PortalTestGlobals;
_g.__portalTestHandlers ??= {};

/** Simulate an EventBus event by calling all registered handlers */
function simulateEvent(event: string, data: unknown): void {
  const g = globalThis as unknown as PortalTestGlobals;
  const handlers = g.__portalTestHandlers?.[event] ?? [];
  for (const handler of handlers) {
    handler(data);
  }
}

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock TimeService
vi.mock('../../../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn(() => 0),
    getGameTime: vi.fn(() => 0),
  },
}));

// Mock EventBus — capture handlers via globalThis
vi.mock('../../../services/core/EventBus', () => {
  const g = globalThis as unknown as PortalTestGlobals;
  const handlerMap = g.__portalTestHandlers ?? (g.__portalTestHandlers = {});
  return {
    EventBus: {
      emit: vi.fn(),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        (handlerMap[event] ??= []).push(handler);
        return vi.fn();
      }),
      off: vi.fn(),
    },
  };
});

describe('PortalSystemV2', () => {
  let portalSystem: ReturnType<typeof createPortalSystemV2>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear captured handlers before creating a new instance registers fresh ones
    const handlerMap = _g.__portalTestHandlers ?? (_g.__portalTestHandlers = {});
    Object.keys(handlerMap).forEach(key => {
      delete handlerMap[key];
    });
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
      expect(PORTAL_V2_CONFIG.FIRST_PORTAL_MIN_TIME).toBe(120);
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
      // 20 streak = 2 milestones = 50 coins bonus with default rates
      portalSystem.setMaxStreak(20);
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      const result = portalSystem.enterPortal();
      // TAKE_PROFIT portal adds 20% bonus, so the base bonus is calculated first
      // But let's check streakBonus directly if it exposes it, or at least expect it's calculated
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

  describe('Kill Counting', () => {
    it('should start kill count at 0', () => {
      expect(portalSystem.getKillCount()).toBe(0);
    });

    it('should increment kill count on enemyKilled event', () => {
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      expect(portalSystem.getKillCount()).toBe(1);
    });

    it('should correctly count after multiple kills', () => {
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      simulateEvent('enemyKilled', { enemyType: 'elite' });
      simulateEvent('enemyKilled', { enemyType: 'whale', coinDrop: 50 });
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      expect(portalSystem.getKillCount()).toBe(5);
    });
  });

  describe('Level Tracking', () => {
    it('should start at level 1', () => {
      expect(portalSystem.getCurrentLevel()).toBe(1);
    });

    it('should update on levelUpComplete event', () => {
      simulateEvent('levelUpComplete', { newLevel: 5 });
      expect(portalSystem.getCurrentLevel()).toBe(5);
    });

    it('should track the latest level', () => {
      simulateEvent('levelUpComplete', { newLevel: 2 });
      simulateEvent('levelUpComplete', { newLevel: 3 });
      simulateEvent('levelUpComplete', { newLevel: 7 });
      expect(portalSystem.getCurrentLevel()).toBe(7);
    });
  });

  describe('Reset Behavior for Kill and Level', () => {
    it('should zero killCount on reset', () => {
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      expect(portalSystem.getKillCount()).toBe(2);

      portalSystem.reset();
      expect(portalSystem.getKillCount()).toBe(0);
    });

    it('should reset currentLevel to 1 on reset', () => {
      simulateEvent('levelUpComplete', { newLevel: 10 });
      expect(portalSystem.getCurrentLevel()).toBe(10);

      portalSystem.reset();
      expect(portalSystem.getCurrentLevel()).toBe(1);
    });
  });

  describe('Reward Calculation Uses Exact Kills/Level', () => {
    it('enterPortal() passes killCount and currentLevel to calculator', () => {
      // Accumulate kills and levels
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      simulateEvent('enemyKilled', { enemyType: 'basic' });
      simulateEvent('levelUpComplete', { newLevel: 4 });

      // Spawn a portal so enterPortal works with an active portal
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(350);
      portalSystem.update(16, 0.15, 800, 600);

      const result = portalSystem.enterPortal();

      // With 3 kills at 5 coins/kill = 15 kill bonus (before portal modifier)
      // TAKE_PROFIT gives +20% bonus on base+kills+market
      // Level 4 * 50 = 200 level bonus
      // Verify kill bonus is derived from exactly 3 kills
      // base killBonus before portal modifier = 3 * 5 = 15
      // TAKE_PROFIT doesn't modify killBonus directly, so raw = killBonus = 15
      expect(result.breakdown.raw).toBe(15); // raw maps to killBonus = kills * perKill
      expect(result.exitType).toBe('portal');
      expect(result.portalType).toBe('TAKE_PROFIT');
    });

    it('onPlayerDeath() passes killCount and currentLevel to calculator', () => {
      // Accumulate kills and levels
      for (let i = 0; i < 10; i++) {
        simulateEvent('enemyKilled', { enemyType: 'basic' });
      }
      simulateEvent('levelUpComplete', { newLevel: 3 });
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(300);

      const result = portalSystem.onPlayerDeath(false);

      // Death: killBonus = floor(10 * 5 * 0.5) = 25, levelBonus = floor(3 * 50 * 0.5) = 75
      // base = 0, market = 0, streak = 0
      expect(result.breakdown.raw).toBe(25); // killBonus after death penalty
      expect(result.total).toBe(25 + 75); // killBonus + levelBonus
      expect(result.exitType).toBe('death');
    });

    it('onPlayerDeath(afk) gives zero regardless of kills/level', () => {
      for (let i = 0; i < 20; i++) {
        simulateEvent('enemyKilled', { enemyType: 'basic' });
      }
      simulateEvent('levelUpComplete', { newLevel: 10 });

      const result = portalSystem.onPlayerDeath(true);
      expect(result.total).toBe(0);
      expect(result.exitType).toBe('afk_death');
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
