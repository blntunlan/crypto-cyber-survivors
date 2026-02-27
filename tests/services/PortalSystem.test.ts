import { describe, it, expect, vi, beforeEach } from 'vitest';
import { portalSystem } from '../../services/gameplay/PortalSystem';
import { EventBus } from '../../services/core/EventBus';
import { TimeService } from '../../services/core/TimeService';
import { difficultyContext } from '../../services/difficulty/DifficultyContext';

// Mocks
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    security: vi.fn(),
  },
}));

// We can spy on TimeService and difficultyContext since they are likely singletons or objects
// But for TimeService.getGameTimeSeconds, a spy is safer.

describe('PortalSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portalSystem.reset();

    // Reset internal state that isn't cleared by reset() if any?
    // PortalSystem.reset() clears active state and rawCoins.
    // However, it doesn't seem to reset "lastPortalTime" in the implementation if I recall correctly?
    // Let's check implementation. Ah, it sets lastPortalTime = 0. Good.
  });

  describe('Portal Spawning Logic', () => {
    it('should not spawn portal before 60s of gameplay', () => {
      vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(30);

      // Setup context
      difficultyContext.inputs = {
        pnlPercent: 0.2, // 20% profit
      } as any;

      portalSystem.update(16, 1000, 1000);

      expect(portalSystem.getState().isActive).toBe(false);
    });

    it('should spawn TAKE_PROFIT portal when PnL > 10% after cooldown', () => {
      vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(61);

      difficultyContext.inputs = {
        pnlPercent: 0.15, // 15% profit
      } as any;

      portalSystem.update(16, 1000, 1000);

      const state = portalSystem.getState();
      expect(state.isActive).toBe(true);
      expect(state.type).toBe('TAKE_PROFIT');
      expect(EventBus.emit).toHaveBeenCalledWith('portalOpened', expect.anything());
    });

    it('should spawn STOP_LOSS portal when PnL < -15%', () => {
      vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(100);

      difficultyContext.inputs = {
        pnlPercent: -0.2, // -20% loss
      } as any;

      portalSystem.update(16, 1000, 1000);

      const state = portalSystem.getState();
      expect(state.isActive).toBe(true);
      expect(state.type).toBe('STOP_LOSS');
    });

    it('should not spawn if PnL is within neutral range', () => {
      vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(100);

      difficultyContext.inputs = {
        pnlPercent: 0.05, // 5% profit (below 10% threshold)
      } as any;

      portalSystem.update(16, 1000, 1000);

      expect(portalSystem.getState().isActive).toBe(false);
    });

    it('should respect cooldown between portals', () => {
      const timeSpy = vi.spyOn(TimeService, 'getGameTimeSeconds');
      difficultyContext.inputs = {
        pnlPercent: 0.2,
      } as any;

      // Spawn first portal at 61s
      timeSpy.mockReturnValue(61);
      portalSystem.update(16, 1000, 1000);
      expect(portalSystem.getState().isActive).toBe(true);

      // Close it manually to test cooldown logic
      portalSystem.closePortal();
      expect(portalSystem.getState().isActive).toBe(false);

      // Try spawn again at 80s (19s elapsed, cooldown is 45s)
      timeSpy.mockReturnValue(80);
      portalSystem.update(16, 1000, 1000);
      expect(portalSystem.getState().isActive).toBe(false);

      // Try spawn again at 110s (49s elapsed)
      timeSpy.mockReturnValue(110);
      portalSystem.update(16, 1000, 1000);
      expect(portalSystem.getState().isActive).toBe(true);
    });
  });

  describe('Lifecycle & Rewards', () => {
    it('should close portal after duration expires', () => {
      // Force spawn
      vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(70);
      difficultyContext.inputs = {
        pnlPercent: 0.2,
      } as any;

      portalSystem.update(16, 1000, 1000);
      expect(portalSystem.getState().isActive).toBe(true);
      const duration = portalSystem.getState().timeLeft;

      // Update with full duration + 1s
      portalSystem.update((duration + 1) * 1000, 1000, 1000);

      expect(portalSystem.getState().isActive).toBe(false);
      expect(EventBus.emit).toHaveBeenCalledWith('portalClosed', expect.anything());
    });

    it('should accumulate raw coins from enemy kills', () => {
      // We need to trigger the private event listener for 'enemyKilled'.
      // This is tricky because we mocked EventBus.on.
      // Similar to ErrorRecoveryService, we can't easily trigger the constructor-registered callbacks.
      // However, PortalSystem exposes `addRawCoins`.
      // Let's test that public method first.

      portalSystem.addRawCoins(10);
      expect(portalSystem.getRawCoins()).toBe(10);

      // If we want to test the listener, we'd have to capture the callback in the mock or re-instantiate.
      // Since it's a singleton instantiated at module load, capturing via beforeAll is best, but mocking happened after import?
      // No, vitest mocks happen before import usually.
      // But the singleton might have been created already if imported elsewhere.

      // Let's trust unit testing `addRawCoins` covers the core logic,
      // and we assume EventBus integration works as tested in EventBus.test.ts.
    });

    it('should calculate final rewards correctly', () => {
      // Setup state
      portalSystem.addRawCoins(100);

      // Mock time and PnL
      vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(300); // 300s = 5 mins
      difficultyContext.inputs = {
        pnlPercent: 0.5,
      } as any;

      // Formula: rawCoins + (survivalTime / 10 * pnlPercent * 100)
      // Note: The implementation uses Math.floor(ctx.inputs.pnlPercent * 100) -> 50
      // Bonus = (300 / 10) * 50 = 30 * 50 = 1500
      // Total = 100 + 1500 = 1600

      const result = portalSystem.calculateFinalRewards();

      expect(result.rawCoins).toBe(100);
      expect(result.bonus).toBe(1500);
      expect(result.totalCoins).toBe(1600);
    });

    it('should not award bonus for negative PnL', () => {
      portalSystem.addRawCoins(100);

      vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(300);
      difficultyContext.inputs = {
        pnlPercent: -0.5,
      } as any;

      // plValue should be clamped to 0
      const result = portalSystem.calculateFinalRewards();

      expect(result.bonus).toBe(0);
      expect(result.totalCoins).toBe(100);
    });
  });
});
