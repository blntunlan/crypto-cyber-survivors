/**
 * Bitcoin-PNL-Difficulty Integration Tests
 *
 * Tests the core game mechanic: Bitcoin price changes affect game difficulty.
 * - LONG position: Price UP = profit = easier game
 * - SHORT position: Price DOWN = profit = easier game
 * - Leverage amplifies the effect
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { MarketPosition } from '../types';
import { TimeService } from '../services/core/TimeService';

vi.mock('../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn().mockReturnValue(0),
    getGameTime: vi.fn().mockReturnValue(0),
  },
}));

vi.mock('../services/difficulty/GameMasterBrain', () => ({
  GameMasterBrain: {
    update: vi.fn(),
    getOutputs: vi.fn(() => ({
      spawnRate: 1.0,
      enemySpeed: 1.0,
      enemyHP: 1.0,
      enemyDamage: 1.0,
      gemDropRate: 1.0,
      xpMultiplier: 1.0,
      whaleType: 0,
      eventIntensity: 0.3,
      aggression: 0.4,
      chaos: 0.3,
      mercyWindow: 0.2,
      pressureRamp: 0.5,
    })),
  },
}));

vi.mock('../services/indicators/MarketIndicatorService', () => ({
  marketIndicatorService: {
    getState: vi.fn(() => ({
      rsi: 50,
      atrPercent: 0.02,
      normalizedVolume: 0.5,
    })),
  },
}));

vi.mock('../services/difficulty/factors/macd', () => ({
  calculateMACDFactor: vi.fn(() => 0),
}));

vi.mock('../services/combat/PoolManager', () => ({
  PoolManager: {
    getInstance: vi.fn(() => ({
      activeGems: [],
    })),
  },
}));

describe('Bitcoin-PNL-Difficulty System', () => {
  beforeEach(() => {
    DifficultyManager.startGame();
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230);
  });

  // Helper function to calculate PNL based on position
  const calculatePnl = (
    entryPrice: number,
    currentPrice: number,
    position: MarketPosition
  ): number => {
    let pnl = (currentPrice - entryPrice) / entryPrice;
    if (position === MarketPosition.SHORT) {
      pnl = -pnl;
    }
    return pnl;
  };

  describe('PNL Calculation', () => {
    it('should calculate positive PNL when LONG and price goes UP', () => {
      const pnl = calculatePnl(100000, 101000, MarketPosition.LONG);
      expect(pnl).toBeCloseTo(0.01, 4); // +1% profit
    });

    it('should calculate negative PNL when LONG and price goes DOWN', () => {
      const pnl = calculatePnl(100000, 99000, MarketPosition.LONG);
      expect(pnl).toBeCloseTo(-0.01, 4); // -1% loss
    });

    it('should calculate positive PNL when SHORT and price goes DOWN', () => {
      const pnl = calculatePnl(100000, 99000, MarketPosition.SHORT);
      expect(pnl).toBeCloseTo(0.01, 4); // +1% profit (inverted)
    });

    it('should calculate negative PNL when SHORT and price goes UP', () => {
      const pnl = calculatePnl(100000, 101000, MarketPosition.SHORT);
      expect(pnl).toBeCloseTo(-0.01, 4); // -1% loss (inverted)
    });
  });

  describe('Leverage Effect', () => {
    it('should amplify PNL by leverage multiplier', () => {
      const basePnl = 0.01; // 1%
      const leverage = 10;
      const effectivePnl = basePnl * leverage;

      expect(effectivePnl).toBe(0.1); // 10%
    });

    it('should amplify losses as well as profits', () => {
      const basePnl = -0.01; // -1%
      const leverage = 25;
      const effectivePnl = basePnl * leverage;

      expect(effectivePnl).toBe(-0.25); // -25%
    });
  });

  describe('Difficulty Response to PNL', () => {
    it('should make game EASIER when player is profiting', () => {
      const neutralDifficulty = DifficultyManager.calculate(0, 0, 1, 1.0);

      DifficultyManager.startGame();
      const profitDifficulty = DifficultyManager.calculate(0.05, 0, 1, 1.0); // +5% profit

      expect(profitDifficulty.total).toBeLessThan(neutralDifficulty.total);
      expect(profitDifficulty.spawnRate).toBeLessThanOrEqual(
        neutralDifficulty.spawnRate
      );
      expect(profitDifficulty.enemySpeed).toBeLessThanOrEqual(
        neutralDifficulty.enemySpeed
      );
    });

    it('should make game HARDER when player is losing', () => {
      const neutralDifficulty = DifficultyManager.calculate(0, 0, 1, 1.0);

      DifficultyManager.startGame();
      const lossDifficulty = DifficultyManager.calculate(-0.05, 0, 1, 1.0); // -5% loss

      expect(lossDifficulty.total).toBeGreaterThan(neutralDifficulty.total);
      expect(lossDifficulty.spawnRate).toBeGreaterThanOrEqual(
        neutralDifficulty.spawnRate
      );
      expect(lossDifficulty.enemySpeed).toBeGreaterThanOrEqual(
        neutralDifficulty.enemySpeed
      );
    });

    it('should scale difficulty with loss magnitude', () => {
      DifficultyManager.startGame();
      const smallLoss = DifficultyManager.calculate(-0.02, 0, 1, 1.0);

      DifficultyManager.startGame();
      const largeLoss = DifficultyManager.calculate(-0.1, 0, 1, 1.0);

      expect(largeLoss.total).toBeGreaterThan(smallLoss.total);
    });

    it('should not go below minimum difficulty even with huge profits', () => {
      const hugeProfitDifficulty = DifficultyManager.calculate(0.5, 0, 1, 1.0); // +50% profit

      expect(hugeProfitDifficulty.total).toBeGreaterThanOrEqual(0.3);
    });

    it('should not exceed maximum difficulty even with huge losses', () => {
      const hugeLossDifficulty = DifficultyManager.calculate(-0.5, 0, 1, 1.0); // -50% loss

      expect(hugeLossDifficulty.total).toBeLessThanOrEqual(8.0);
    });
  });

  describe('Volatility (ATR) Effect', () => {
    it('should increase difficulty during high volatility', () => {
      const lowVolatility = DifficultyManager.calculate(0, 0.002, 1, 1.0); // 0.2% ATR

      DifficultyManager.startGame();
      const highVolatility = DifficultyManager.calculate(0, 0.03, 1, 1.0); // 3% ATR

      expect(highVolatility.enemySpeed).toBeGreaterThan(lowVolatility.enemySpeed);
    });

    it('should combine volatility with PNL effect', () => {
      const hardMode = DifficultyManager.calculate(-0.1, 0.05, 5, 0.5); // Loss + Volatility
      const easyMode = DifficultyManager.calculate(0.1, 0.002, 1, 1.0); // Profit + Stability

      expect(hardMode.total).toBeGreaterThan(easyMode.total * 1.2); // Significantly harder with new scalers
    });
  });

  describe('Near-Death Mercy', () => {
    it('should reduce difficulty when HP drops below 20%', () => {
      const normalHp = DifficultyManager.calculate(-0.03, 0, 5, 1.0);

      DifficultyManager.startGame();
      const lowHp = DifficultyManager.calculate(-0.03, 0, 5, 0.15); // 15% HP

      expect(lowHp.total).toBeLessThan(normalHp.total);
    });

    it('should give losing players a chance to recover', () => {
      // Losing + low HP = mercy kick in
      DifficultyManager.startGame();
      const desperateSituation = DifficultyManager.calculate(-0.1, 0.02, 5, 0.1);

      // Even with -10% PNL and high volatility, near-death should help
      expect(desperateSituation.total).toBeLessThan(8.0); // Not max difficulty
    });
  });

  describe('Real-World Scenarios', () => {
    it('Scenario: LONG position, BTC pumps 3% with 10x leverage', () => {
      // Entry: $100,000, Current: $103,000
      const rawPnl = 0.03; // +3%
      const leverage = 10;
      const effectivePnl = rawPnl * leverage; // +30%

      const difficulty = DifficultyManager.calculate(effectivePnl, 0.01, 5, 0.8);

      // Should be relatively easy (compared to losses) but climax phase adds base pressure
      expect(difficulty.total).toBeLessThan(2.3);
    });

    it('Scenario: SHORT position, BTC pumps 3% with 10x leverage', () => {
      // Entry: $100,000, Current: $103,000 - SHORT is losing
      const rawPnl = -0.03; // -3% (inverted for SHORT)
      const leverage = 10;
      const effectivePnl = rawPnl * leverage; // -30%

      // Advance time to mock Climax phase (avoid Warmup 0.3 factor)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230);
      const difficulty = DifficultyManager.calculate(effectivePnl, 0.01, 5, 0.8);

      // Should be quite hard
      expect(difficulty.total).toBeGreaterThan(2.0);
    });

    it('Scenario: Sideways market with high volatility', () => {
      // Advance to climax phase for realistic testing
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230);

      // No directional PNL but market is choppy
      const difficulty = DifficultyManager.calculate(0, 0.04, 5, 0.8);

      // Volatility alone should increase difficulty somewhat
      expect(difficulty.enemySpeed).toBeGreaterThanOrEqual(0.6); // Adjusted for V2 scaling
    });

    it('Scenario: Player recovering from near-death during crash', () => {
      // Market crashing (-5%), player is LONG, HP is critical
      DifficultyManager.startGame();
      const criticalMoment = DifficultyManager.calculate(-0.05, 0.02, 5, 0.12);

      // Mercy system should prevent total destruction
      expect(criticalMoment.total).toBeLessThan(4.0);
    });
  });
});
